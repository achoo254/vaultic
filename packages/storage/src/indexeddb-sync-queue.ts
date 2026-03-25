// IndexedDB-backed sync queue — tracks pending local changes for cloud sync

import type { SyncQueueEntry } from '@vaultic/types';
import type { SyncQueue } from './sync-queue';
import { openDB, QUEUE_STORE } from './indexeddb-open';

/** IndexedDB-backed sync queue. */
export class IndexedDBSyncQueue implements SyncQueue {
  async enqueue(entry: SyncQueueEntry): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(entry);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async dequeueAll(): Promise<SyncQueueEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const request = tx.objectStore(QUEUE_STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(ids: string[]): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    for (const id of ids) {
      store.delete(id);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const request = tx.objectStore(QUEUE_STORE).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
