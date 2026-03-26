// Tests for in-memory vault store
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../memory-store';
import { ItemType, type VaultItem } from '@vaultic/types';

function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: crypto.randomUUID(),
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
    expect(await store.getItem('mem-1')).toEqual(item);
  });

  it('getItem returns null for missing ID', async () => {
    expect(await store.getItem('nope')).toBeNull();
  });

  it('getAllItems returns all items', async () => {
    await store.putItem(makeItem({ id: 'a' }));
    await store.putItem(makeItem({ id: 'b' }));
    expect(await store.getAllItems()).toHaveLength(2);
  });

  it('deleteItem removes item', async () => {
    await store.putItem(makeItem({ id: 'del' }));
    await store.deleteItem('del');
    expect(await store.getItem('del')).toBeNull();
  });

  it('putItem updates existing item', async () => {
    await store.putItem(makeItem({ id: 'upd', encrypted_data: 'v1' }));
    await store.putItem(makeItem({ id: 'upd', encrypted_data: 'v2' }));
    const item = await store.getItem('upd');
    expect(item?.encrypted_data).toBe('v2');
  });

  it('clear removes all items and folders', async () => {
    await store.putItem(makeItem({ id: 'x' }));
    await store.putFolder({ id: 'f', encrypted_name: 'enc', created_at: '', updated_at: '' });
    await store.clear();
    expect(await store.getAllItems()).toHaveLength(0);
    expect(await store.getAllFolders()).toHaveLength(0);
  });

  it('getChangedSince filters by timestamp', async () => {
    await store.putItem(makeItem({ id: 'old', updated_at: '2025-01-01T00:00:00Z' }));
    await store.putItem(makeItem({ id: 'new', updated_at: '2026-06-01T00:00:00Z' }));
    const changed = await store.getChangedSince(new Date('2026-01-01').getTime());
    expect(changed).toHaveLength(1);
    expect(changed[0].id).toBe('new');
  });
});
