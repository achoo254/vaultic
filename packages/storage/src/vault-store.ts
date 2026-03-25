// VaultStore interface — storage abstraction for encrypted vault items

import type { VaultItem, Folder } from '@vaultic/types';

export interface VaultStore {
  // Vault items
  getItem(id: string): Promise<VaultItem | null>;
  putItem(item: VaultItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  getAllItems(): Promise<VaultItem[]>;
  getChangedSince(timestamp: number): Promise<VaultItem[]>;

  // Folders
  getFolder(id: string): Promise<Folder | null>;
  putFolder(folder: Folder): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  getAllFolders(): Promise<Folder[]>;

  // Bulk operations
  clear(): Promise<void>;
}
