# Phase 3: Auth Store + Vault Store Integration

## Overview
Wire userId from auth-store into vault-store operations. Backfill existing items.

## Files to Modify

### 1. `client/apps/extension/src/stores/auth-store.ts`

**Expose `currentUserId` getter:**
- Online mode → `VaultConfig.userId` (from JWT)
- Offline mode → `"local"` (fixed string)

Add helper:
```typescript
// Returns current profile userId for IndexedDB scoping
getCurrentUserId: () => {
  const { mode, userId } = get();
  return mode === 'online' && userId ? userId : 'local';
}
```

**`upgradeToOnline()`** — after re-encrypting, re-tag items:
```typescript
// After re-encryption, update user_id from "local" to new userId
const allItems = await store.getAllItems('local');
for (const item of allItems) {
  await store.putItem({ ...item, user_id: newUserId });
}
const allFolders = await store.getAllFolders('local');
for (const folder of allFolders) {
  await store.putFolder({ ...folder, user_id: newUserId });
}
```

### 2. `client/apps/extension/src/stores/vault-store.ts`

**All CRUD operations use `getCurrentUserId()`:**

```typescript
// Import
import { useAuthStore } from './auth-store';

const getUserId = () => useAuthStore.getState().getCurrentUserId();
```

**`loadVault()`** — filter + backfill migration:
```typescript
loadVault: async () => {
  const userId = getUserId();
  let items = await store.getAllItems(userId);

  // Migration: backfill items without user_id (from IDB v2)
  if (items.length === 0) {
    const allItems = await store.getAllItems('');  // get items with no user_id
    // Actually need a different approach — see below
  }
  // ...decrypt and set state
}
```

**Migration strategy for existing items:**
Since pre-v3 items have `user_id = undefined`, they won't match any userId query.
Add a one-time migration in `loadVault()`:
```typescript
// Check for un-tagged items and assign current userId
const allRaw = await store.getAllItemsUnfiltered(); // new method, temporary
const untagged = allRaw.filter(i => !i.user_id);
if (untagged.length > 0) {
  const userId = getUserId();
  for (const item of untagged) {
    await store.putItem({ ...item, user_id: userId });
  }
}
```
Add `getAllItemsUnfiltered()` to VaultStore as a temporary migration helper (can remove later).

**`addItem()`:**
```typescript
const item: VaultItem = {
  id,
  user_id: getUserId(),        // NEW
  folder_id: folderId,
  // ...rest
};
await store.putItem(item);
await syncQueue.enqueue({
  id: crypto.randomUUID(),
  user_id: getUserId(),         // NEW
  item_id: id,
  action: 'create',
  timestamp: Date.now(),
});
```

**Same pattern for `updateItem()`, `deleteItem()`, `addFolder()`, `deleteFolder()`.**

## Success Criteria
- [x] `getCurrentUserId()` returns `"local"` for offline, real userId for online
- [x] `loadVault()` only shows current user's items
- [x] New items tagged with correct `user_id`
- [x] Queue entries tagged with `user_id`
- [x] Existing items (pre-migration) get backfilled on first load
- [x] `upgradeToOnline()` re-tags items from `"local"` to new userId
- [x] `tsc --noEmit` passes

## Risks
- Backfill migration assigns ALL untagged items to current user — correct only if single-user was using IDB before upgrade
- `getAllItemsUnfiltered()` is a migration-only method — document and plan removal
