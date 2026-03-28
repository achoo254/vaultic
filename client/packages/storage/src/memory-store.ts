// In-memory VaultStore implementation for testing

import type { VaultItem, Folder } from '@vaultic/types';
import type { VaultStore } from './vault-store';

/** In-memory vault store for testing */
export class MemoryStore implements VaultStore {
  private items = new Map<string, VaultItem>();
  private folders = new Map<string, Folder>();

  async getItem(userId: string, id: string): Promise<VaultItem | null> {
    const item = this.items.get(id);
    if (!item) return null;
    return (!item.user_id || item.user_id === userId) ? item : null;
  }

  async putItem(item: VaultItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async deleteItem(userId: string, id: string): Promise<void> {
    const item = await this.getItem(userId, id);
    if (item) this.items.delete(id);
  }

  async getAllItems(userId: string): Promise<VaultItem[]> {
    return Array.from(this.items.values()).filter((i) => i.user_id === userId && !i.deleted_at);
  }

  async getAllItemsUnfiltered(): Promise<VaultItem[]> {
    return Array.from(this.items.values());
  }

  async getChangedSince(userId: string, timestamp: number): Promise<VaultItem[]> {
    return Array.from(this.items.values()).filter(
      (item) => item.user_id === userId && new Date(item.updated_at).getTime() > timestamp,
    );
  }

  async getFolder(userId: string, id: string): Promise<Folder | null> {
    const folder = this.folders.get(id);
    if (!folder) return null;
    return (!folder.user_id || folder.user_id === userId) ? folder : null;
  }

  async putFolder(folder: Folder): Promise<void> {
    this.folders.set(folder.id, folder);
  }

  async deleteFolder(userId: string, id: string): Promise<void> {
    const folder = await this.getFolder(userId, id);
    if (folder) this.folders.delete(id);
  }

  async getAllFolders(userId: string): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter((f) => f.user_id === userId);
  }

  async getAllFoldersUnfiltered(): Promise<Folder[]> {
    return Array.from(this.folders.values());
  }

  async clear(userId?: string): Promise<void> {
    if (userId) {
      for (const [id, item] of this.items) {
        if (item.user_id === userId) this.items.delete(id);
      }
      for (const [id, folder] of this.folders) {
        if (folder.user_id === userId) this.folders.delete(id);
      }
    } else {
      this.items.clear();
      this.folders.clear();
    }
  }
}
