// Custom hook: cloud sync state + handlers for SettingsPage
// Extracted to keep settings-page.tsx under 200 lines

import { useState, useEffect } from 'react';
import { IndexedDBStore, IndexedDBSyncQueue } from '@vaultic/storage';
import { SyncEngine, LWWResolver, getDeviceId } from '@vaultic/sync';
import { useAuthStore } from '../../stores/auth-store';
import { fetchWithAuth } from '../../lib/fetch-with-auth';
import { toApiItem, toApiFolder, fromApiItem, fromApiFolder } from '../../lib/sync-api-transforms';

export interface SyncSettingsState {
  syncEnabled: boolean;
  syncStatus: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  showEnableSyncModal: boolean;
  showDisableSyncModal: boolean;
  setSyncEnabled: (v: boolean) => void;
  setShowEnableSyncModal: (v: boolean) => void;
  setShowDisableSyncModal: (v: boolean) => void;
  handleSyncToggle: () => void;
  handleSyncNow: () => Promise<void>;
  handleEnableSyncConfirm: () => Promise<void>;
  handleDisableSync: (deleteData: boolean) => void;
}

export function useSyncSettings(saveSetting: (key: string, value: number | boolean) => void): SyncSettingsState {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Local only');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showEnableSyncModal, setShowEnableSyncModal] = useState(false);
  const [showDisableSyncModal, setShowDisableSyncModal] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['sync_enabled']).then((r) => {
      if (r.sync_enabled) { setSyncEnabled(true); setSyncStatus('Synced'); }
    });
    const userId = useAuthStore.getState().getCurrentUserId();
    const idbStore = new IndexedDBStore();
    idbStore.getMetadata(`last_sync_${userId}`).then((ts) => {
      if (ts) setLastSyncedAt(ts);
    });
  }, []);

  const handleSyncToggle = () => {
    if (!syncEnabled) setShowEnableSyncModal(true);
    else setShowDisableSyncModal(true);
  };

  const handleDisableSync = (deleteData: boolean) => {
    setShowDisableSyncModal(false);
    setSyncEnabled(false);
    setSyncStatus('Local only');
    setLastSyncedAt(null);
    saveSetting('sync_enabled', false);
    if (deleteData) {
      fetchWithAuth('/api/v1/sync/data', { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing || !syncEnabled) return;
    setIsSyncing(true);
    setSyncStatus('Syncing...');
    try {
      const store = new IndexedDBStore();
      const queue = new IndexedDBSyncQueue();
      const userId = useAuthStore.getState().getCurrentUserId();
      const engine = new SyncEngine(store, queue, {
        async push(data) {
          const payload = {
            deviceId: data.device_id,
            items: data.items.map(toApiItem),
            folders: data.folders.map(toApiFolder),
          };
          const res = await fetchWithAuth('/api/v1/sync/push', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          return res.json();
        },
        async pull(since, deviceId) {
          const params = new URLSearchParams({ deviceId });
          if (since) params.set('since', since);
          const res = await fetchWithAuth(`/api/v1/sync/pull?${params}`);
          const data = await res.json();
          return {
            ...data,
            items: (data.items || []).map(fromApiItem),
            folders: (data.folders || []).map(fromApiFolder),
          };
        },
      }, new LWWResolver(), userId);
      const result = await engine.sync();
      setSyncStatus(`Synced (↑${result.pushed} ↓${result.pulled})`);
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      console.error('[SyncNow] error:', err);
      setSyncStatus(err instanceof Error ? `Failed: ${err.message}` : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEnableSyncConfirm = async () => {
    setShowEnableSyncModal(false);
    setSyncEnabled(true);
    setSyncStatus('Syncing...');
    saveSetting('sync_enabled', true);
    try {
      const store = new IndexedDBStore();
      const userId = useAuthStore.getState().getCurrentUserId();
      const items = await store.getAllItems(userId);
      await fetchWithAuth('/api/v1/sync/push', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: getDeviceId(),
          items: items.map(toApiItem),
          folders: [],
        }),
      });
      setSyncStatus('Synced');
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      console.error('[EnableSync] error:', err);
      setSyncStatus(err instanceof Error ? `Failed: ${err.message}` : 'Sync failed');
    }
  };

  return {
    syncEnabled, syncStatus, isSyncing, lastSyncedAt,
    showEnableSyncModal, showDisableSyncModal,
    setSyncEnabled, setShowEnableSyncModal, setShowDisableSyncModal,
    handleSyncToggle, handleSyncNow, handleEnableSyncConfirm, handleDisableSync,
  };
}
