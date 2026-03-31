// Shared SyncEngine factory — DRY creation for popup, background SW, and settings
// Module-level singleton prevents duplicate instances within same context

import { IndexedDBStore, IndexedDBSyncQueue } from '@vaultic/storage';
import { SyncEngine, LWWResolver } from '@vaultic/sync';
import type { SyncApiAdapter } from '@vaultic/sync';
import { fetchWithAuth } from './create-auth-fetch';
import { toApiItem, toApiFolder, fromApiItem, fromApiFolder } from '@vaultic/api';

let cachedEngine: { userId: string; engine: SyncEngine } | null = null;

/** Create or reuse a SyncEngine for the given userId. */
export function createSyncEngine(userId: string): SyncEngine {
  if (cachedEngine && cachedEngine.userId === userId) {
    return cachedEngine.engine;
  }

  const store = new IndexedDBStore();
  const queue = new IndexedDBSyncQueue();

  const apiAdapter: SyncApiAdapter = {
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
    async pull(since, deviceId, cursor) {
      const params = new URLSearchParams({ deviceId });
      if (since) params.set('since', since);
      if (cursor) params.set('cursor', cursor);
      const res = await fetchWithAuth(`/api/v1/sync/pull?${params}`);
      const data = await res.json();
      return {
        ...data,
        items: (data.items || []).map(fromApiItem),
        folders: (data.folders || []).map(fromApiFolder),
      };
    },
  };

  const engine = new SyncEngine(store, queue, apiAdapter, new LWWResolver(), userId);
  cachedEngine = { userId, engine };
  return engine;
}
