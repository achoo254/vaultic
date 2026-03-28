// Tests for in-memory vault store
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../memory-store';
import { ItemType, type VaultItem } from '@vaultic/types';

const TEST_USER = 'test-user';

function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: crypto.randomUUID(),
    user_id: TEST_USER,
    item_type: ItemType.Login,
    encrypted_data: 'encrypted',
    device_id: 'dev',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('putItem + getItem roundtrip', async () => {
    const item = makeItem({ id: 'mem-1' });
    await store.putItem(item);
    expect(await store.getItem(TEST_USER, 'mem-1')).toEqual(item);
  });

  it('getItem returns null for missing ID', async () => {
    expect(await store.getItem(TEST_USER, 'nope')).toBeNull();
  });

  it('getItem returns null for wrong userId', async () => {
    await store.putItem(makeItem({ id: 'x' }));
    expect(await store.getItem('other-user', 'x')).toBeNull();
  });

  it('getAllItems returns only matching user items', async () => {
    await store.putItem(makeItem({ id: 'a' }));
    await store.putItem(makeItem({ id: 'b' }));
    await store.putItem(makeItem({ id: 'c', user_id: 'other' }));
    expect(await store.getAllItems(TEST_USER)).toHaveLength(2);
  });

  it('deleteItem removes item', async () => {
    await store.putItem(makeItem({ id: 'del' }));
    await store.deleteItem(TEST_USER, 'del');
    expect(await store.getItem(TEST_USER, 'del')).toBeNull();
  });

  it('putItem updates existing item', async () => {
    await store.putItem(makeItem({ id: 'upd', encrypted_data: 'v1' }));
    await store.putItem(makeItem({ id: 'upd', encrypted_data: 'v2' }));
    const item = await store.getItem(TEST_USER, 'upd');
    expect(item?.encrypted_data).toBe('v2');
  });

  it('clear removes all items and folders', async () => {
    await store.putItem(makeItem({ id: 'x' }));
    await store.putFolder({ id: 'f', user_id: TEST_USER, encrypted_name: 'enc', created_at: '', updated_at: '' });
    await store.clear();
    expect(await store.getAllItems(TEST_USER)).toHaveLength(0);
    expect(await store.getAllFolders(TEST_USER)).toHaveLength(0);
  });

  it('getChangedSince filters by timestamp and userId', async () => {
    await store.putItem(makeItem({ id: 'old', updated_at: '2025-01-01T00:00:00Z' }));
    await store.putItem(makeItem({ id: 'new', updated_at: '2026-06-01T00:00:00Z' }));
    const changed = await store.getChangedSince(TEST_USER, new Date('2026-01-01').getTime());
    expect(changed).toHaveLength(1);
    expect(changed[0].id).toBe('new');
  });
});
