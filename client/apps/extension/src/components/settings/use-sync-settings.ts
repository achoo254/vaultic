// Custom hook: cloud sync state + handlers for SettingsPage
// Extracted to keep settings-page.tsx under 200 lines

import { useState, useEffect } from 'react';
import { IndexedDBStore } from '@vaultic/storage';
import { useAuthStore } from '../../stores/auth-store';
import { fetchWithAuth } from '../../lib/fetch-with-auth';
import { createSyncEngine } from '../../lib/create-sync-engine';

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
      const userId = useAuthStore.getState().getCurrentUserId();
      const engine = createSyncEngine(userId);
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
      const userId = useAuthStore.getState().getCurrentUserId();
      const engine = createSyncEngine(userId);
      const result = await engine.sync();
      setSyncStatus(`Synced (↑${result.pushed} ↓${result.pulled})`);
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
