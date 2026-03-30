// Tests for SyncEngine — mutex, pagination, folder dedup, error handling
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../sync-engine';
import type { SyncApiAdapter } from '../sync-engine';
import { LWWResolver } from '../conflict-resolver';
import type { VaultItem, Folder, SyncQueueEntry } from '@vaultic/types';
import type { VaultStore, SyncQueue } from '@vaultic/storage';

// Mock getDeviceId
vi.mock('../device', () => ({ getDeviceId: vi.fn().mockResolvedValue('test-device-id') }));

// Mock navigator.onLine as true for all tests
vi.stubGlobal('navigator', { onLine: true });

type StoreWithMeta = VaultStore & { getMetadata(key: string): Promise<string | null>; setMetadata(key: string, value: string): Promise<void> };

function makeItem(id: string, updatedAt = '2026-01-01T00:00:00Z'): VaultItem {
  return { id, user_id: 'user1', item_type: 1 as VaultItem['item_type'], encrypted_data: 'enc', device_id: 'dev', version: 1, created_at: updatedAt, updated_at: updatedAt };
}

function createMocks() {
  const storedItems = new Map<string, VaultItem>();
  const storedFolders = new Map<string, Folder>();
  const metadata = new Map<string, string>();

  const store: StoreWithMeta = {
    getItem: vi.fn(async (_uid: string, id: string) => storedItems.get(id) ?? null),
    putItem: vi.fn(async (item: VaultItem) => { storedItems.set(item.id, item); }),
    deleteItem: vi.fn(async (_uid: string, id: string) => { storedItems.delete(id); }),
    getAllItems: vi.fn(async () => Array.from(storedItems.values())),
    getAllItemsUnfiltered: vi.fn(async () => Array.from(storedItems.values())),
    getChangedSince: vi.fn(async () => []),
    getFolder: vi.fn(async (_uid: string, id: string) => storedFolders.get(id) ?? null),
    putFolder: vi.fn(async (f: Folder) => { storedFolders.set(f.id, f); }),
    deleteFolder: vi.fn(async (_uid: string, id: string) => { storedFolders.delete(id); }),
    getAllFolders: vi.fn(async () => Array.from(storedFolders.values())),
    getAllFoldersUnfiltered: vi.fn(async () => Array.from(storedFolders.values())),
    clear: vi.fn(),
    getMetadata: vi.fn(async (key: string) => metadata.get(key) ?? null),
    setMetadata: vi.fn(async (key: string, value: string) => { metadata.set(key, value); }),
  };

  const queue: SyncQueue = {
    enqueue: vi.fn(),
    getPending: vi.fn(async () => [] as SyncQueueEntry[]),
    clear: vi.fn(),
    count: vi.fn(async () => 0),
  };

  const api: SyncApiAdapter = {
    push: vi.fn(async () => ({ accepted_items: [], accepted_folders: [], conflicts: [] })),
    pull: vi.fn(async () => ({ items: [], folders: [], deleted_ids: [], server_time: '2026-01-01T12:00:00Z' })),
  };

  return { store, queue, api, storedItems, storedFolders, metadata };
}

describe('SyncEngine', () => {
  let store: StoreWithMeta;
  let queue: SyncQueue;
  let api: SyncApiAdapter;
  let engine: SyncEngine;

  beforeEach(() => {
    const mocks = createMocks();
    store = mocks.store;
    queue = mocks.queue;
    api = mocks.api;
    engine = new SyncEngine(store, queue, api, new LWWResolver(), 'user1');
  });

  // --- Mutex ---

  it('prevents concurrent sync calls', async () => {
    // Make pull slow to test mutex
    let resolveFirst: () => void;
    const firstCallPromise = new Promise<void>((r) => { resolveFirst = r; });
    vi.mocked(api.pull).mockImplementationOnce(async () => {
      await firstCallPromise;
      return { items: [], folders: [], deleted_ids: [], server_time: '2026-01-01T12:00:00Z' };
    });

    const sync1 = engine.sync();
    const sync2 = engine.sync(); // Should return idle immediately

    const result2 = await sync2;
    expect(result2).toEqual({ status: 'idle', pushed: 0, pulled: 0, conflicts: 0 });

    resolveFirst!();
    const result1 = await sync1;
    expect(result1.status).toBe('idle');
    // pull called only once (second sync skipped)
    expect(api.pull).toHaveBeenCalledTimes(1);
  });

  it('releases mutex after error', async () => {
    vi.mocked(queue.getPending).mockRejectedValueOnce(new Error('db error'));
    const result1 = await engine.sync();
    expect(result1.status).toBe('error');

    // Should be able to sync again
    const result2 = await engine.sync();
    expect(result2.status).toBe('idle');
  });

  // --- Pagination ---

  it('paginates pull until has_more is false', async () => {
    vi.mocked(api.pull)
      .mockResolvedValueOnce({
        items: [makeItem('i1')], folders: [], deleted_ids: [],
        server_time: 'T1', has_more: true, next_cursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        items: [makeItem('i2')], folders: [], deleted_ids: [],
        server_time: 'T2', has_more: false,
      });

    const result = await engine.sync();
    expect(api.pull).toHaveBeenCalledTimes(2);
    expect(result.pulled).toBe(2); // 2 items
    expect(store.putItem).toHaveBeenCalledTimes(2);
  });

  it('passes cursor to subsequent pull calls', async () => {
    vi.mocked(api.pull)
      .mockResolvedValueOnce({
        items: [], folders: [], deleted_ids: [],
        server_time: 'T1', has_more: true, next_cursor: 'abc',
      })
      .mockResolvedValueOnce({
        items: [], folders: [], deleted_ids: [],
        server_time: 'T2',
      });

    await engine.sync();
    expect(api.pull).toHaveBeenNthCalledWith(2, null, 'test-device-id', 'abc');
  });

  // --- Folder dedup ---

  it('deduplicates folders across pages', async () => {
    const folder = { id: 'f1', encrypted_name: 'enc', updated_at: '2026-01-02T00:00:00Z' };
    vi.mocked(api.pull)
      .mockResolvedValueOnce({
        items: [], folders: [folder], deleted_ids: [],
        server_time: 'T1', has_more: true, next_cursor: 'c1',
      })
      .mockResolvedValueOnce({
        items: [], folders: [folder], deleted_ids: [], // same folder again
        server_time: 'T2',
      });

    await engine.sync();
    // putFolder called once (deduplicated)
    expect(store.putFolder).toHaveBeenCalledTimes(1);
  });

  // --- Push ---

  it('pushes pending items and clears queue', async () => {
    const entry: SyncQueueEntry = { id: 'q1', user_id: 'user1', item_id: 'i1', type: 'item', action: 'create', timestamp: Date.now() };
    vi.mocked(queue.getPending).mockResolvedValue([entry]);
    vi.mocked(store.getItem).mockResolvedValue(makeItem('i1'));
    vi.mocked(api.push).mockResolvedValue({ accepted_items: ['i1'], accepted_folders: [], conflicts: [] });

    const result = await engine.sync();
    expect(result.pushed).toBe(1);
    expect(queue.clear).toHaveBeenCalledWith(['q1']);
  });

  // --- Error handling ---

  it('returns error status on push failure', async () => {
    vi.mocked(queue.getPending).mockRejectedValue(new Error('push fail'));
    const result = await engine.sync();
    expect(result.status).toBe('error');
  });

  it('returns error status on pull failure', async () => {
    vi.mocked(api.pull).mockRejectedValue(new Error('pull fail'));
    const result = await engine.sync();
    expect(result.status).toBe('error');
  });

  // --- serverTime guard ---

  it('does not save empty serverTime', async () => {
    vi.mocked(api.pull).mockResolvedValue({
      items: [], folders: [], deleted_ids: [], server_time: '',
    });
    await engine.sync();
    expect(store.setMetadata).not.toHaveBeenCalled();
  });

  it('saves non-empty serverTime', async () => {
    vi.mocked(api.pull).mockResolvedValue({
      items: [], folders: [], deleted_ids: [], server_time: '2026-01-01T12:00:00Z',
    });
    await engine.sync();
    expect(store.setMetadata).toHaveBeenCalledWith('last_sync_user1', '2026-01-01T12:00:00Z');
  });
});
