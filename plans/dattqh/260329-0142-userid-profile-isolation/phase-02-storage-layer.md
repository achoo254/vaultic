# Phase 2: Storage Layer — userId-scoped Operations

## Overview
Update `VaultStore` interface and `IndexedDBStore`/`IndexedDBSyncQueue` to filter by userId.

## Files to Modify

### 1. `client/packages/storage/src/vault-store.ts` (interface)
All methods gain `userId` param:
```typescript
export interface VaultStore {
  getItem(userId: string, id: string): Promise<VaultItem | null>;
  putItem(item: VaultItem): Promise<void>;          // user_id already in item
  deleteItem(userId: string, id: string): Promise<void>;
  getAllItems(userId: string): Promise<VaultItem[]>;
  getChangedSince(userId: string, timestamp: number): Promise<VaultItem[]>;

  getFolder(userId: string, id: string): Promise<Folder | null>;
  putFolder(folder: Folder): Promise<void>;          // user_id already in folder
  deleteFolder(userId: string, id: string): Promise<void>;
  getAllFolders(userId: string): Promise<Folder[]>;

  clear(userId?: string): Promise<void>;             // optional: clear only user's data

  getMetadata(key: string): Promise<string | null>;
  setMetadata(key: string, value: string): Promise<void>;
}
```

### 2. `client/packages/storage/src/indexeddb-store.ts`
Update implementation to use `user_id` index:

**`getAllItems(userId)`** — use index cursor:
```typescript
async getAllItems(userId: string): Promise<VaultItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, 'readonly');
    const index = tx.objectStore(ITEMS_STORE).index('user_id');
    const request = index.getAll(userId);
    request.onsuccess = () => {
      resolve((request.result as VaultItem[]).filter(i => !i.deleted_at));
    };
    request.onerror = () => reject(request.error);
  });
}
```

**`getItem(userId, id)`** — get by id, verify user_id matches:
```typescript
async getItem(userId: string, id: string): Promise<VaultItem | null> {
  const item = await withStore<VaultItem | undefined>(ITEMS_STORE, 'readonly', s => s.get(id));
  return item && item.user_id === userId ? item : null;
}
```

Same pattern for `getAllFolders(userId)`, `getFolder(userId, id)`, `deleteItem(userId, id)`, etc.

### 3. `client/packages/storage/src/indexeddb-sync-queue.ts`
Add userId filtering to `SyncQueue` interface:

```typescript
export interface SyncQueue {
  enqueue(entry: SyncQueueEntry): Promise<void>;
  dequeueAll(userId: string): Promise<SyncQueueEntry[]>;  // CHANGED
  clear(ids: string[]): Promise<void>;
  count(userId?: string): Promise<number>;                 // CHANGED
}
```

**`dequeueAll(userId)`** — use index:
```typescript
async dequeueAll(userId: string): Promise<SyncQueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const index = tx.objectStore(QUEUE_STORE).index('user_id');
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

## Success Criteria
- [x] All VaultStore methods accept userId param
- [x] `getAllItems("local")` returns only offline user's items
- [x] `dequeueAll("user123")` returns only that user's queue entries
- [x] `pnpm build` passes for `@vaultic/storage`
- [x] Existing tests updated (if any)

## Risks
- Breaking change to VaultStore interface — all consumers need update (Phase 3)
- Items without `user_id` (pre-migration) won't appear in filtered queries until backfilled
