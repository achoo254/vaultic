# Phase 1: Types + IndexedDB Schema

## Overview
Add `user_id` to shared types, bump IDB version 2→3 with migration.

## Files to Modify

### 1. `shared/types/src/vault.ts`
Add `user_id: string` to `VaultItem` and `Folder`:
```typescript
export interface VaultItem {
  id: string;
  user_id: string;          // NEW — "local" or JWT userId
  folder_id?: string;
  // ... rest unchanged
}

export interface Folder {
  id: string;
  user_id: string;          // NEW
  encrypted_name: string;
  // ... rest unchanged
}
```

### 2. `shared/types/src/sync.ts`
Add `user_id: string` to `SyncQueueEntry`:
```typescript
export interface SyncQueueEntry {
  id: string;
  user_id: string;          // NEW
  item_id: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
}
```

### 3. `client/packages/storage/src/indexeddb-open.ts`
Bump version 2→3, add migration:
```typescript
const DB_VERSION = 3;

request.onupgradeneeded = (event) => {
  const db = request.result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 2) {
    // Existing v1→v2 migration (create stores)
    // ... keep as-is
  }

  if (oldVersion < 3) {
    // v2→v3: Add user_id index to vault_items, folders, sync_queue
    const itemStore = request.transaction!.objectStore(ITEMS_STORE);
    itemStore.createIndex('user_id', 'user_id', { unique: false });

    const folderStore = request.transaction!.objectStore(FOLDERS_STORE);
    folderStore.createIndex('user_id', 'user_id', { unique: false });

    const queueStore = request.transaction!.objectStore(QUEUE_STORE);
    queueStore.createIndex('user_id', 'user_id', { unique: false });
  }
};
```

**Note:** Existing items will have `user_id = undefined`. Phase 3 handles backfill during `loadVault()`.

## Success Criteria
- [x] `pnpm build` passes for `@vaultic/types` and `@vaultic/storage`
- [x] IDB opens at version 3 with `user_id` indexes
- [x] No breaking changes to existing functionality (user_id optional during migration)

## Risks
- IDB upgrade runs once per browser — if it fails, DB stuck. Keep migration minimal.
- Existing items without `user_id` need graceful handling until backfilled.
