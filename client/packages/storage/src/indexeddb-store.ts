// IndexedDB implementation of VaultStore — primary storage for browser extension
// All data stored is encrypted (ciphertext blobs only)

import type { VaultItem, Folder } from '@vaultic/types';
import type { VaultStore } from './vault-store';
import { openDB, resetDBCache, ITEMS_STORE, FOLDERS_STORE, META_STORE } from './indexeddb-open';

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

/** Get all records from a store using user_id index. */
async function getAllByUserId<T>(storeName: string, userId: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index('user_id');
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/** Get all records from a store (unfiltered). */
async function getAll<T>(storeName: string): Promise<T[]> {
  return withStore(storeName, 'readonly', (s) => s.getAll());
}

/** IndexedDB-backed vault store for browser extension. */
export class IndexedDBStore implements VaultStore {
  async getItem(userId: string, id: string): Promise<VaultItem | null> {
    const item = await withStore<VaultItem | undefined>(
      ITEMS_STORE, 'readonly', (s) => s.get(id),
    );
    if (!item) return null;
    // Allow match if item has no user_id (pre-migration) or matches userId
    return (!item.user_id || item.user_id === userId) ? item : null;
  }

  async putItem(item: VaultItem): Promise<void> {
    if (!item.user_id) {
      throw new Error('putItem requires item.user_id to be set');
    }
    const existing = await withStore<VaultItem | undefined>(
      ITEMS_STORE, 'readonly', (s) => s.get(item.id),
    );
    if (existing && existing.user_id && existing.user_id !== item.user_id) {
      throw new Error('Cannot overwrite item belonging to different user');
    }
    await withStore(ITEMS_STORE, 'readwrite', (s) => s.put(item));
  }

  async deleteItem(userId: string, id: string): Promise<void> {
    const item = await this.getItem(userId, id);
    if (item) {
      await withStore(ITEMS_STORE, 'readwrite', (s) => s.delete(id));
    }
  }

  async getAllItems(userId: string): Promise<VaultItem[]> {
    const items = await getAllByUserId<VaultItem>(ITEMS_STORE, userId);
    return items.filter((i) => !i.deleted_at);
  }

  async getAllItemsUnfiltered(): Promise<VaultItem[]> {
    return getAll<VaultItem>(ITEMS_STORE);
  }

  async getChangedSince(userId: string, timestamp: number): Promise<VaultItem[]> {
    const items = await getAllByUserId<VaultItem>(ITEMS_STORE, userId);
    return items.filter((i) => new Date(i.updated_at).getTime() > timestamp);
  }

  async getFolder(userId: string, id: string): Promise<Folder | null> {
    const folder = await withStore<Folder | undefined>(
      FOLDERS_STORE, 'readonly', (s) => s.get(id),
    );
    if (!folder) return null;
    return (!folder.user_id || folder.user_id === userId) ? folder : null;
  }

  async putFolder(folder: Folder): Promise<void> {
    if (!folder.user_id) {
      throw new Error('putFolder requires folder.user_id to be set');
    }
    const existing = await withStore<Folder | undefined>(
      FOLDERS_STORE, 'readonly', (s) => s.get(folder.id),
    );
    if (existing && existing.user_id && existing.user_id !== folder.user_id) {
      throw new Error('Cannot overwrite folder belonging to different user');
    }
    await withStore(FOLDERS_STORE, 'readwrite', (s) => s.put(folder));
  }

  async deleteFolder(userId: string, id: string): Promise<void> {
    const folder = await this.getFolder(userId, id);
    if (folder) {
      await withStore(FOLDERS_STORE, 'readwrite', (s) => s.delete(id));
    }
  }

  async getAllFolders(userId: string): Promise<Folder[]> {
    return getAllByUserId<Folder>(FOLDERS_STORE, userId);
  }

  async getAllFoldersUnfiltered(): Promise<Folder[]> {
    return getAll<Folder>(FOLDERS_STORE);
  }

  async clear(userId?: string): Promise<void> {
    if (userId) {
      // Clear only this user's data
      const items = await getAllByUserId<VaultItem>(ITEMS_STORE, userId);
      const folders = await getAllByUserId<Folder>(FOLDERS_STORE, userId);
      const db = await openDB();
      const tx = db.transaction([ITEMS_STORE, FOLDERS_STORE], 'readwrite');
      const itemStore = tx.objectStore(ITEMS_STORE);
      const folderStore = tx.objectStore(FOLDERS_STORE);
      for (const item of items) itemStore.delete(item.id);
      for (const folder of folders) folderStore.delete(folder.id);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    // Clear all data
    const db = await openDB();
    const tx = db.transaction([ITEMS_STORE, FOLDERS_STORE, META_STORE], 'readwrite');
    tx.objectStore(ITEMS_STORE).clear();
    tx.objectStore(FOLDERS_STORE).clear();
    tx.objectStore(META_STORE).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resetDBCache(); resolve(); };
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
