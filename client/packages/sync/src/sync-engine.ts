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
  ) {}

  async sync(): Promise<SyncResult> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
    }

    const deviceId = getDeviceId();
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // 1. Push pending local changes
    const pending = await this.queue.dequeueAll();
    if (pending.length > 0) {
      const itemIds = new Set(pending.map((p) => p.item_id));
      const items: VaultItem[] = [];

      for (const id of itemIds) {
        const item = await this.store.getItem(id);
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

    // 2. Pull remote changes since last sync
    const lastSync = await this.store.getMetadata('last_sync');
    const delta = await this.api.pull(lastSync, deviceId);

    for (const remoteItem of delta.items) {
      const local = await this.store.getItem(remoteItem.id);
      if (local) {
        // Resolve conflict with LWW
        const winner = this.resolver.resolve(
          { id: local.id, encrypted_data: local.encrypted_data, version: local.version, updated_at: local.updated_at },
          { id: remoteItem.id, encrypted_data: remoteItem.encrypted_data, version: remoteItem.version, updated_at: remoteItem.updated_at },
        );
        if (winner.updated_at === remoteItem.updated_at) {
          await this.store.putItem(remoteItem);
        }
      } else {
        await this.store.putItem(remoteItem);
      }
    }

    // Handle deletions
    for (const id of delta.deleted_ids) {
      await this.store.deleteItem(id);
    }

    pulled = delta.items.length + delta.deleted_ids.length;
    await this.store.setMetadata('last_sync', delta.server_time);

    return { status: 'idle', pushed, pulled, conflicts };
  }
}
