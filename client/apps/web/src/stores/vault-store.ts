// Zustand vault store for web app — offline-first CRUD with sync queue
// Adapted from extension: uses web-storage, no chrome.runtime messaging

import { create } from 'zustand';
import type { VaultItem, Folder, LoginCredential, ItemType } from '@vaultic/types';
import { IndexedDBStore, IndexedDBSyncQueue } from '@vaultic/storage';
import { encryptVaultItem, decryptVaultItem, encryptFolderName, decryptFolderName } from '@vaultic/crypto';
import { getDeviceId } from '@vaultic/sync';
import { getEncryptionKey } from '../lib/web-storage';
import { useAuthStore } from './auth-store';

const store = new IndexedDBStore();
const syncQueue = new IndexedDBSyncQueue();

const getUserId = () => useAuthStore.getState().getCurrentUserId();

/** Cached decrypted item for UI display. */
export interface DecryptedVaultItem {
  id: string;
  folder_id?: string;
  item_type: string;
  credential: LoginCredential;
  created_at: string;
  updated_at: string;
}

interface DecryptedFolder {
  id: string;
  name: string;
  parent_id?: string;
  itemCount: number;
}

interface VaultState {
  items: DecryptedVaultItem[];
  folders: DecryptedFolder[];
  searchQuery: string;
  selectedFolder: string | null;
  loading: boolean;
}

interface VaultActions {
  loadVault: () => Promise<void>;
  addItem: (credential: LoginCredential, folderId?: string) => Promise<void>;
  updateItem: (id: string, credential: LoginCredential, folderId?: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedFolder: (folderId: string | null) => void;
  addFolder: (name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

type VaultStoreType = VaultState & VaultActions;

export const useVaultStore = create<VaultStoreType>((set, get) => ({
  items: [],
  folders: [],
  searchQuery: '',
  selectedFolder: null,
  loading: false,

  loadVault: async () => {
    set({ loading: true });
    try {
      const key = await getEncryptionKey();
      if (!key) { set({ loading: false }); return; }

      const userId = getUserId();
      const encItems = await store.getAllItems(userId);
      const encFolders = await store.getAllFolders(userId);

      const decrypted: DecryptedVaultItem[] = [];
      for (const item of encItems) {
        try {
          const credential = await decryptVaultItem(key, item.encrypted_data);
          decrypted.push({
            id: item.id, folder_id: item.folder_id, item_type: item.item_type,
            credential, created_at: item.created_at, updated_at: item.updated_at,
          });
        } catch { /* skip corrupted items */ }
      }

      const folders: DecryptedFolder[] = [];
      for (const f of encFolders) {
        try {
          const name = await decryptFolderName(key, f.encrypted_name);
          const itemCount = decrypted.filter((i) => i.folder_id === f.id).length;
          folders.push({ id: f.id, name, parent_id: f.parent_id, itemCount });
        } catch { /* skip corrupted folders */ }
      }

      set({ items: decrypted, folders, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addItem: async (credential, folderId) => {
    const key = await getEncryptionKey();
    if (!key) throw new Error('Vault is locked');

    const userId = getUserId();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const encrypted = await encryptVaultItem(key, credential);

    const item: VaultItem = {
      id, user_id: userId, folder_id: folderId,
      item_type: 'login' as ItemType, encrypted_data: encrypted,
      device_id: await getDeviceId(), version: 1,
      created_at: now, updated_at: now,
    };

    await store.putItem(item);
    await syncQueue.enqueue({
      id: crypto.randomUUID(), user_id: userId, item_id: id,
      type: 'item', action: 'create', timestamp: Date.now(),
    });

    set({
      items: [...get().items, {
        id, folder_id: folderId, item_type: 'login',
        credential, created_at: now, updated_at: now,
      }],
    });
  },

  updateItem: async (id, credential, folderId?) => {
    const key = await getEncryptionKey();
    if (!key) throw new Error('Vault is locked');

    const userId = getUserId();
    const existing = await store.getItem(userId, id);
    if (!existing) throw new Error('Item not found');

    const now = new Date().toISOString();
    const encrypted = await encryptVaultItem(key, credential);

    const updated: VaultItem = {
      ...existing, encrypted_data: encrypted,
      folder_id: folderId !== undefined ? (folderId || undefined) : existing.folder_id,
      version: existing.version + 1, updated_at: now,
    };

    await store.putItem(updated);
    await syncQueue.enqueue({
      id: crypto.randomUUID(), user_id: userId, item_id: id,
      type: 'item', action: 'update', timestamp: Date.now(),
    });

    set({
      items: get().items.map((i) =>
        i.id === id ? { ...i, credential, updated_at: now } : i,
      ),
    });
  },

  deleteItem: async (id) => {
    const userId = getUserId();
    const existing = await store.getItem(userId, id);
    if (!existing) return;

    const now = new Date().toISOString();
    await store.putItem({ ...existing, deleted_at: now, updated_at: now });
    await syncQueue.enqueue({
      id: crypto.randomUUID(), user_id: userId, item_id: id,
      type: 'item', action: 'delete', timestamp: Date.now(),
    });

    set({ items: get().items.filter((i) => i.id !== id) });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),

  addFolder: async (name) => {
    const key = await getEncryptionKey();
    if (!key) throw new Error('Vault is locked');

    const userId = getUserId();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const encryptedName = await encryptFolderName(key, name);

    const folder: Folder = {
      id, user_id: userId, encrypted_name: encryptedName,
      created_at: now, updated_at: now,
    };
    await store.putFolder(folder);
    await syncQueue.enqueue({
      id: crypto.randomUUID(), user_id: userId, item_id: id,
      type: 'folder', action: 'create', timestamp: Date.now(),
    });

    set({ folders: [...get().folders, { id, name, itemCount: 0 }] });
  },

  deleteFolder: async (id) => {
    const userId = getUserId();
    await store.deleteFolder(userId, id);
    await syncQueue.enqueue({
      id: crypto.randomUUID(), user_id: userId, item_id: id,
      type: 'folder', action: 'delete', timestamp: Date.now(),
    });

    const itemsToUpdate = get().items.filter((i) => i.folder_id === id);
    for (const item of itemsToUpdate) {
      const existing = await store.getItem(userId, item.id);
      if (existing) {
        await store.putItem({ ...existing, folder_id: undefined });
      }
    }
    set({
      items: get().items.map((i) => i.folder_id === id ? { ...i, folder_id: undefined } : i),
      folders: get().folders.filter((f) => f.id !== id),
    });
  },

  syncNow: async () => {
    const { createSyncEngine } = await import('../lib/create-sync-engine');
    const userId = getUserId();
    const engine = createSyncEngine(userId);
    await engine.sync();
    // Reload vault after sync to show updated data
    await get().loadVault();
  },
}));

/** Filter items by search query and selected folder. */
export function useFilteredItems() {
  const { items, searchQuery, selectedFolder } = useVaultStore();

  return items.filter((item) => {
    if (selectedFolder && item.folder_id !== selectedFolder) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const c = item.credential;
      return (
        c.name.toLowerCase().includes(q) ||
        c.url?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
      );
    }
    return true;
  });
}
