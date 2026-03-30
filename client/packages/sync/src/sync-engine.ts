// Delta sync engine — pushes local changes, pulls remote changes
// Sync is user-controlled: only runs when Cloud Sync is enabled

import type { SyncStatus, VaultItem, Folder } from '@vaultic/types';
import type { VaultStore, SyncQueue } from '@vaultic/storage';
import type { ConflictResolver } from './conflict-resolver';
import { getDeviceId } from './device';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  status: SyncStatus;
}

export interface SyncApiAdapter {
  push(data: {
    device_id: string;
    items: VaultItem[];
    folders: Array<{ id: string; encrypted_name: string; parent_id?: string; updated_at: string; deleted_at?: string }>;
  }): Promise<{ accepted_items: string[]; accepted_folders: string[]; conflicts: Array<{ id: string }> }>;

  pull(since: string | null, deviceId: string, cursor?: string | null): Promise<{
    items: VaultItem[];
    folders: Array<{ id: string; encrypted_name: string; parent_id?: string; updated_at: string; deleted_at?: string }>;
    deleted_ids: string[];
    server_time: string;
    has_more?: boolean;
    next_cursor?: string;
  }>;
}

/** Delta sync engine — opt-in cloud sync with LWW conflict resolution. */
export class SyncEngine {
  private _isSyncing = false;

  constructor(
    private store: VaultStore & { getMetadata(key: string): Promise<string | null>; setMetadata(key: string, value: string): Promise<void> },
    private queue: SyncQueue,
    private api: SyncApiAdapter,
    private resolver: ConflictResolver,
    private userId: string,
  ) {}

  async sync(): Promise<SyncResult> {
    if (this._isSyncing) {
      return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
    }
    this._isSyncing = true;
    try {
      return await this._doSync();
    } finally {
      this._isSyncing = false;
    }
  }

  private async _doSync(): Promise<SyncResult> {

    const deviceId = await getDeviceId();
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // 1. Push pending local changes (scoped to userId)
    try {
      const pending = await this.queue.getPending(this.userId);
      if (pending.length > 0) {
        // Separate item vs folder entries from queue
        const itemEntries = pending.filter((p) => p.type !== 'folder');
        const folderEntries = pending.filter((p) => p.type === 'folder');

        const itemIds = new Set(itemEntries.map((p) => p.item_id));
        const items: VaultItem[] = [];
        for (const id of itemIds) {
          const item = await this.store.getItem(this.userId, id);
          if (item) items.push(item);
        }

        const folderIds = new Set(folderEntries.map((p) => p.item_id));
        const folders: Folder[] = [];
        for (const id of folderIds) {
          const folder = await this.store.getFolder(this.userId, id);
          if (folder) folders.push(folder);
        }

        const result = await this.api.push({
          device_id: deviceId,
          items,
          folders: folders.map((f) => ({
            id: f.id,
            encrypted_name: f.encrypted_name,
            parent_id: f.parent_id,
            updated_at: f.updated_at,
          })),
        });

        // Clear accepted entries from queue (both items and folders)
        const acceptedSet = new Set([...result.accepted_items, ...result.accepted_folders]);
        const acceptedIds = pending
          .filter((p) => acceptedSet.has(p.item_id))
          .map((p) => p.id);
        await this.queue.clear(acceptedIds);
        pushed = result.accepted_items.length + result.accepted_folders.length;
        conflicts = result.conflicts.length;
      }
    } catch (err) {
      console.error('[SyncEngine] push failed', err);
      return { status: 'error', pushed: 0, pulled: 0, conflicts: 0 };
    }

    // 2. Pull remote changes since last sync (per-user cursor) with pagination
    try {
      const lastSyncKey = `last_sync_${this.userId}`;
      const lastSync = await this.store.getMetadata(lastSyncKey);

      // Paginate pull until server says no more pages
      const allItems: VaultItem[] = [];
      const folderMap = new Map<string, { id: string; encrypted_name: string; parent_id?: string; updated_at: string; deleted_at?: string }>();
      const deletedIdSet = new Set<string>();
      let cursor: string | null = null;
      let serverTime = '';
      const MAX_PAGES = 50; // safety cap

      for (let page = 0; page < MAX_PAGES; page++) {
        const delta = await this.api.pull(lastSync, deviceId, cursor);
        allItems.push(...delta.items);
        // Deduplicate folders (server may return all folders on each page)
        for (const f of delta.folders) folderMap.set(f.id, f);
        for (const id of delta.deleted_ids) deletedIdSet.add(id);
        serverTime = delta.server_time;
        if (!delta.has_more || !delta.next_cursor) break;
        cursor = delta.next_cursor;
      }

      const allFolders = Array.from(folderMap.values());
      const allDeletedIds = Array.from(deletedIdSet);

      for (const remoteItem of allItems) {
        // Tag pulled items with current userId
        const tagged = { ...remoteItem, user_id: this.userId } as VaultItem;
        const local = await this.store.getItem(this.userId, remoteItem.id);
        if (local) {
          const winner = this.resolver.resolve(
            { id: local.id, encrypted_data: local.encrypted_data, version: local.version, updated_at: local.updated_at },
            { id: tagged.id, encrypted_data: tagged.encrypted_data, version: tagged.version, updated_at: tagged.updated_at },
          );
          if (winner.updated_at === tagged.updated_at) {
            await this.store.putItem(tagged);
          }
        } else {
          await this.store.putItem(tagged);
        }
      }

      // Apply remote folders with LWW
      for (const remoteFolder of allFolders) {
        const tagged: Folder = { ...remoteFolder, user_id: this.userId, created_at: remoteFolder.updated_at };
        const localFolder = await this.store.getFolder(this.userId, remoteFolder.id);
        if (localFolder) {
          const localTime = new Date(localFolder.updated_at).getTime();
          const remoteTime = new Date(remoteFolder.updated_at).getTime();
          if (remoteTime > localTime) {
            await this.store.putFolder(tagged);
          }
        } else {
          await this.store.putFolder(tagged);
        }
      }

      // Handle deletions (items + folders)
      for (const id of allDeletedIds) {
        await this.store.deleteItem(this.userId, id);
        await this.store.deleteFolder(this.userId, id);
      }

      pulled = allItems.length + allFolders.length + allDeletedIds.length;
      if (serverTime) {
        await this.store.setMetadata(lastSyncKey, serverTime);
      }
    } catch (err) {
      console.error('[SyncEngine] pull failed', err);
      return { status: 'error', pushed, pulled: 0, conflicts };
    }

    return { status: 'idle', pushed, pulled, conflicts };
  }
}
