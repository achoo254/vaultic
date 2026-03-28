// Shared IndexedDB database opener — single source of truth for schema

const DB_NAME = 'vaultic';
const DB_VERSION = 3;

export const ITEMS_STORE = 'vault_items';
export const FOLDERS_STORE = 'folders';
export const META_STORE = 'metadata';
export const QUEUE_STORE = 'sync_queue';

// Exported for test resets — not part of public API
export let dbPromise: Promise<IDBDatabase> | null = null;

/** Open or get cached IDBDatabase connection with full schema. */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

      if (oldVersion < 2) {
        const items = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
        items.createIndex('updated_at', 'updated_at', { unique: false });
        items.createIndex('folder_id', 'folder_id', { unique: false });
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
        db.createObjectStore(META_STORE, { keyPath: 'key' });
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }

      if (oldVersion < 3) {
        // v2→v3: Add user_id index to vault_items, folders, sync_queue
        const tx = request.transaction!;
        const itemStore = tx.objectStore(ITEMS_STORE);
        if (!itemStore.indexNames.contains('user_id')) {
          itemStore.createIndex('user_id', 'user_id', { unique: false });
        }
        const folderStore = tx.objectStore(FOLDERS_STORE);
        if (!folderStore.indexNames.contains('user_id')) {
          folderStore.createIndex('user_id', 'user_id', { unique: false });
        }
        const queueStore = tx.objectStore(QUEUE_STORE);
        if (!queueStore.indexNames.contains('user_id')) {
          queueStore.createIndex('user_id', 'user_id', { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/** Reset cached connection — for testing only. */
export function resetDBCache(): void {
  dbPromise = null;
}
