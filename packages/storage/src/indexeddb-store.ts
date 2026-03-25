// IndexedDB implementation of VaultStore — primary storage for browser extension

import type { VaultItem, Folder } from '@vaultic/types';
import type { VaultStore } from './vault-store';

/** IndexedDB-backed vault store for browser extension */
export class IndexedDBStore implements VaultStore {
  // Implementation in Phase 5
  async getItem(_id: string): Promise<VaultItem | null> {
    throw new Error('Not implemented: Phase 5');
  }

  async putItem(_item: VaultItem): Promise<void> {
    throw new Error('Not implemented: Phase 5');
  }

  async deleteItem(_id: string): Promise<void> {
    throw new Error('Not implemented: Phase 5');
  }

  async getAllItems(): Promise<VaultItem[]> {
    throw new Error('Not implemented: Phase 5');
  }

  async getChangedSince(_timestamp: number): Promise<VaultItem[]> {
    throw new Error('Not implemented: Phase 5');
  }

  async getFolder(_id: string): Promise<Folder | null> {
    throw new Error('Not implemented: Phase 5');
  }

  async putFolder(_folder: Folder): Promise<void> {
    throw new Error('Not implemented: Phase 5');
  }

  async deleteFolder(_id: string): Promise<void> {
    throw new Error('Not implemented: Phase 5');
  }

  async getAllFolders(): Promise<Folder[]> {
    throw new Error('Not implemented: Phase 5');
  }

  async clear(): Promise<void> {
    throw new Error('Not implemented: Phase 5');
  }
}
