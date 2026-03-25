// In-memory VaultStore implementation for testing

import type { VaultItem, Folder } from '@vaultic/types';
import type { VaultStore } from './vault-store';

/** In-memory vault store for testing */
export class MemoryStore implements VaultStore {
  private items = new Map<string, VaultItem>();
  private folders = new Map<string, Folder>();

  async getItem(id: string): Promise<VaultItem | null> {
    return this.items.get(id) ?? null;
  }

  async putItem(item: VaultItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async deleteItem(id: string): Promise<void> {
    this.items.delete(id);
  }

  async getAllItems(): Promise<VaultItem[]> {
    return Array.from(this.items.values());
  }

  async getChangedSince(timestamp: number): Promise<VaultItem[]> {
    return Array.from(this.items.values()).filter(
      (item) => new Date(item.updated_at).getTime() > timestamp,
    );
  }

  async getFolder(id: string): Promise<Folder | null> {
    return this.folders.get(id) ?? null;
  }

  async putFolder(folder: Folder): Promise<void> {
    this.folders.set(folder.id, folder);
  }

  async deleteFolder(id: string): Promise<void> {
    this.folders.delete(id);
  }

  async getAllFolders(): Promise<Folder[]> {
    return Array.from(this.folders.values());
  }

  async clear(): Promise<void> {
    this.items.clear();
    this.folders.clear();
  }
}
