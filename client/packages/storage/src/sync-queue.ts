// SyncQueue interface — tracks pending changes for sync

import type { SyncQueueEntry } from '@vaultic/types';

export interface SyncQueue {
  enqueue(entry: SyncQueueEntry): Promise<void>;
  dequeueAll(userId: string): Promise<SyncQueueEntry[]>;
  clear(ids: string[]): Promise<void>;
  count(userId?: string): Promise<number>;
}
