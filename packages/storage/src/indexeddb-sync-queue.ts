// IndexedDB-backed sync queue — tracks pending local changes for cloud sync

import type { SyncQueueEntry } from '@vaultic/types';
import type { SyncQueue } from './sync-queue';

const DB_NAME = 'vaultic';
const QUEUE_STORE = 'sync_queue';
const DB_VERSION = 2; // Bump for new store

/** Ensure sync_queue object store exists. */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
      // Re-create other stores if they don't exist (first open)
      if (!db.objectStoreNames.contains('vault_items')) {
        const items = db.createObjectStore('vault_items', { keyPath: 'id' });
        items.createIndex('updated_at', 'updated_at', { unique: false });
        items.createIndex('folder_id', 'folder_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** IndexedDB-backed sync queue. */
export class IndexedDBSyncQueue implements SyncQueue {
  async enqueue(entry: SyncQueueEntry): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(entry);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async dequeueAll(): Promise<SyncQueueEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const request = tx.objectStore(QUEUE_STORE).getAll();
      request.onsuccess = () => { db.close(); resolve(request.result); };
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
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const request = tx.objectStore(QUEUE_STORE).count();
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
    });
  }
}
