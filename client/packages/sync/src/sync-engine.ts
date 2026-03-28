// Delta sync engine — pushes local changes, pulls remote changes
// Sync is user-controlled: only runs when Cloud Sync is enabled

import type { SyncStatus, VaultItem } from '@vaultic/types';
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

  pull(since: string | null, deviceId: string): Promise<{
    items: VaultItem[];
    folders: Array<{ id: string; encrypted_name: string; parent_id?: string; updated_at: string; deleted_at?: string }>;
    deleted_ids: string[];
    server_time: string;
  }>;
}

/** Delta sync engine — opt-in cloud sync with LWW conflict resolution. */
export class SyncEngine {
  constructor(
    private store: VaultStore & { getMetadata(key: string): Promise<string | null>; setMetadata(key: string, value: string): Promise<void> },
    private queue: SyncQueue,
    private api: SyncApiAdapter,
    private resolver: ConflictResolver,
    private userId: string,
  ) {}

  async sync(): Promise<SyncResult> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
    }

    const deviceId = getDeviceId();
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // 1. Push pending local changes (scoped to userId)
    const pending = await this.queue.dequeueAll(this.userId);
    if (pending.length > 0) {
      const itemIds = new Set(pending.map((p) => p.item_id));
      const items: VaultItem[] = [];

      for (const id of itemIds) {
        const item = await this.store.getItem(this.userId, id);
        if (item) items.push(item);
      }

      const result = await this.api.push({
        device_id: deviceId,
        items,
        folders: [],
      });

      // Clear accepted entries from queue
      const acceptedIds = pending
        .filter((p) => result.accepted_items.includes(p.item_id))
        .map((p) => p.id);
      await this.queue.clear(acceptedIds);
      pushed = result.accepted_items.length;
      conflicts = result.conflicts.length;
    }

    // 2. Pull remote changes since last sync (per-user cursor)
    const lastSyncKey = `last_sync_${this.userId}`;
    const lastSync = await this.store.getMetadata(lastSyncKey);
    const delta = await this.api.pull(lastSync, deviceId);

    for (const remoteItem of delta.items) {
      // Tag pulled items with current userId
      const tagged = { ...remoteItem, user_id: this.userId } as VaultItem;
      const local = await this.store.getItem(this.userId, remoteItem.id);
      if (local) {
        // Resolve conflict with LWW
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

    // Handle deletions
    for (const id of delta.deleted_ids) {
      await this.store.deleteItem(this.userId, id);
    }

    pulled = delta.items.length + delta.deleted_ids.length;
    await this.store.setMetadata(lastSyncKey, delta.server_time);

    return { status: 'idle', pushed, pulled, conflicts };
  }
}
