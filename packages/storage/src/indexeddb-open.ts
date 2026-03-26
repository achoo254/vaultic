// Shared IndexedDB database opener — single source of truth for schema

const DB_NAME = 'vaultic';
const DB_VERSION = 2;

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

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ITEMS_STORE)) {
        const items = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
        items.createIndex('updated_at', 'updated_at', { unique: false });
        items.createIndex('folder_id', 'folder_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
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
