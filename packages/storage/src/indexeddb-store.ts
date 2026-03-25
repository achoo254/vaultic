// IndexedDB implementation of VaultStore — primary storage for browser extension
// All data stored is encrypted (ciphertext blobs only)

import type { VaultItem, Folder } from '@vaultic/types';
import type { VaultStore } from './vault-store';
import { openDB, ITEMS_STORE, FOLDERS_STORE, META_STORE } from './indexeddb-open';

/** Generic IDB transaction helper. */
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {};
  });
}

/** Get all records from a store. */
async function getAll<T>(storeName: string): Promise<T[]> {
  return withStore(storeName, 'readonly', (s) => s.getAll());
}

/** IndexedDB-backed vault store for browser extension. */
export class IndexedDBStore implements VaultStore {
  async getItem(id: string): Promise<VaultItem | null> {
    const item = await withStore<VaultItem | undefined>(
      ITEMS_STORE, 'readonly', (s) => s.get(id),
    );
    return item ?? null;
  }

  async putItem(item: VaultItem): Promise<void> {
    await withStore(ITEMS_STORE, 'readwrite', (s) => s.put(item));
  }

  async deleteItem(id: string): Promise<void> {
    await withStore(ITEMS_STORE, 'readwrite', (s) => s.delete(id));
  }

  async getAllItems(): Promise<VaultItem[]> {
    const items = await getAll<VaultItem>(ITEMS_STORE);
    // Exclude soft-deleted items from default query
    return items.filter((i) => !i.deleted_at);
  }

  async getChangedSince(timestamp: number): Promise<VaultItem[]> {
    const all = await getAll<VaultItem>(ITEMS_STORE);
    return all.filter((i) => new Date(i.updated_at).getTime() > timestamp);
  }

  async getFolder(id: string): Promise<Folder | null> {
    const folder = await withStore<Folder | undefined>(
      FOLDERS_STORE, 'readonly', (s) => s.get(id),
    );
    return folder ?? null;
  }

  async putFolder(folder: Folder): Promise<void> {
    await withStore(FOLDERS_STORE, 'readwrite', (s) => s.put(folder));
  }

  async deleteFolder(id: string): Promise<void> {
    await withStore(FOLDERS_STORE, 'readwrite', (s) => s.delete(id));
  }

  async getAllFolders(): Promise<Folder[]> {
    return getAll<Folder>(FOLDERS_STORE);
  }

  async clear(): Promise<void> {
    const db = await openDB();
    const tx = db.transaction([ITEMS_STORE, FOLDERS_STORE, META_STORE], 'readwrite');
    tx.objectStore(ITEMS_STORE).clear();
    tx.objectStore(FOLDERS_STORE).clear();
    tx.objectStore(META_STORE).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  // Metadata helpers for sync cursor
  async getMetadata(key: string): Promise<string | null> {
    const result = await withStore<{ key: string; value: string } | undefined>(
      META_STORE, 'readonly', (s) => s.get(key),
    );
    return result?.value ?? null;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    await withStore(META_STORE, 'readwrite', (s) => s.put({ key, value }));
  }
}
