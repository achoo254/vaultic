// Tests for IndexedDB vault store using fake-indexeddb
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBStore } from '../indexeddb-store';
import { resetDBCache } from '../indexeddb-open';
import { ItemType, type VaultItem } from '@vaultic/types';

function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: crypto.randomUUID(),
    item_type: ItemType.Login,
    encrypted_data: 'base64-encrypted-data',
    device_id: 'test-device',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('IndexedDBStore', () => {
  let store: IndexedDBStore;

  beforeEach(() => {
    // Reset the cached DB connection so each test gets a fresh store
    resetDBCache();
    indexedDB = new IDBFactory();
    store = new IndexedDBStore();
  });

  it('putItem stores and getItem retrieves it', async () => {
    const item = makeItem({ id: 'test-1' });
    await store.putItem(item);
    const retrieved = await store.getItem('test-1');
    expect(retrieved).toEqual(item);
  });

  it('getItem returns null for non-existent ID', async () => {
    const result = await store.getItem('nonexistent');
    expect(result).toBeNull();
  });

  it('getAllItems returns all stored items', async () => {
    const item1 = makeItem({ id: 'a' });
    const item2 = makeItem({ id: 'b' });
    await store.putItem(item1);
    await store.putItem(item2);
    const all = await store.getAllItems();
    expect(all).toHaveLength(2);
  });

  it('getAllItems excludes soft-deleted items', async () => {
    const active = makeItem({ id: 'active' });
    const deleted = makeItem({ id: 'deleted', deleted_at: new Date().toISOString() });
    await store.putItem(active);
    await store.putItem(deleted);
    const all = await store.getAllItems();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('active');
  });

  it('deleteItem removes the item', async () => {
    const item = makeItem({ id: 'del-test' });
    await store.putItem(item);
    await store.deleteItem('del-test');
    const result = await store.getItem('del-test');
    expect(result).toBeNull();
  });

  it('putItem with existing ID updates the item', async () => {
    const item = makeItem({ id: 'update-test', encrypted_data: 'v1' });
    await store.putItem(item);
    await store.putItem({ ...item, encrypted_data: 'v2', version: 2 });
    const result = await store.getItem('update-test');
    expect(result?.encrypted_data).toBe('v2');
    expect(result?.version).toBe(2);
  });

  it('metadata get/set works correctly', async () => {
    await store.setMetadata('last_sync', '2026-01-01T00:00:00Z');
    const value = await store.getMetadata('last_sync');
    expect(value).toBe('2026-01-01T00:00:00Z');
  });

  it('getMetadata returns null for missing key', async () => {
    const value = await store.getMetadata('nonexistent');
    expect(value).toBeNull();
  });
});
