// VaultStore interface — storage abstraction for encrypted vault items

import type { VaultItem, Folder } from '@vaultic/types';

export interface VaultStore {
  // Vault items
  getItem(userId: string, id: string): Promise<VaultItem | null>;
  putItem(item: VaultItem): Promise<void>;
  deleteItem(userId: string, id: string): Promise<void>;
  getAllItems(userId: string): Promise<VaultItem[]>;
  getAllItemsUnfiltered(): Promise<VaultItem[]>;
  getChangedSince(userId: string, timestamp: number): Promise<VaultItem[]>;

  // Folders
  getFolder(userId: string, id: string): Promise<Folder | null>;
  putFolder(folder: Folder): Promise<void>;
  deleteFolder(userId: string, id: string): Promise<void>;
  getAllFolders(userId: string): Promise<Folder[]>;
  getAllFoldersUnfiltered(): Promise<Folder[]>;

  // Bulk operations
  clear(userId?: string): Promise<void>;
}
