---
type: code-review
date: 2026-03-29
scope: userId-based profile isolation
files: 13
---

# Code Review: userId-Based Profile Isolation

## Scope
- **Files**: 13 (types, storage, sync, extension stores, settings, credential-handler)
- **Focus**: Security (data isolation correctness), migration safety, missing userId paths, edge cases

## Overall Assessment

Solid implementation. userId scoping is applied consistently across storage interfaces, sync engine, vault CRUD, and background credential handler. The IndexedDB v2-to-v3 migration adds proper indexes. The `getAllItemsUnfiltered()` + backfill pattern handles pre-migration data. A few issues found, mostly medium priority.

---

## Critical Issues

### 1. SECURITY: `putItem` / `putFolder` accept any user_id without validation

**indexeddb-store.ts:53-54, memory-store.ts:17-18**

`putItem(item)` writes whatever `user_id` is on the item. No assertion that the caller's userId matches. A compromised or buggy caller could write items tagged as another user. The interface should either:
- Accept `(userId, item)` and enforce `item.user_id === userId`, or
- Assert inside `putItem` that `item.user_id` is non-empty

**Impact**: A code path that forgets to set `user_id` or sets the wrong one silently pollutes another user's vault.

**Recommendation**:
```ts
async putItem(item: VaultItem): Promise<void> {
  if (!item.user_id) throw new Error('putItem: user_id is required');
  await withStore(ITEMS_STORE, 'readwrite', (s) => s.put(item));
}
```

### 2. SECURITY: `saveCredential` in credential-handler does NOT enqueue to sync queue

**credential-handler.ts:104-128**

When `saveCredential` creates a new item or updates an existing one, it writes to `store.putItem()` but never calls `syncQueue.enqueue()`. This means credentials saved via autofill capture are never synced to the server.

**Impact**: Data loss risk -- user believes credential is saved and synced, but it only exists locally on one device.

**Recommendation**: Import `IndexedDBSyncQueue` and enqueue after both the update path (line 105) and the create path (line 118-128).

---

## High Priority

### 3. Migration backfill race condition in `loadVault()`

**vault-store.ts:69-84**

Every call to `loadVault()` reads ALL unfiltered items, filters for untagged ones, and re-tags them. This runs on every popup open. Issues:
- **Race**: If two popups/tabs call `loadVault()` simultaneously, both read untagged items and write them concurrently. Not dangerous (idempotent writes), but wasteful.
- **Performance**: After initial migration, `getAllItemsUnfiltered()` still scans the entire store every load. Should gate behind a migration flag.

**Recommendation**: Store a `migration_v3_done` metadata flag. Check it first; skip the unfiltered scan if already migrated.

```ts
const migrated = await store.getMetadata('migration_v3_done');
if (!migrated) {
  // ... backfill logic ...
  await store.setMetadata('migration_v3_done', 'true');
}
```

### 4. `upgradeToOnline` re-encryption + re-tagging is not atomic

**auth-store.ts:291-349**

The upgrade flow:
1. Re-encrypts all items with new key
2. Registers with server
3. Re-tags items from "local" to server userId

If step 2 fails (network error), items are already re-encrypted with the new key but still tagged as "local" with the OLD VaultConfig still active. The user cannot decrypt them with the old offline key anymore because the ciphertext changed.

**Impact**: Data loss on network failure during upgrade.

**Recommendation**: Either:
- Re-encrypt into temporary items, only replace originals after successful server registration, OR
- Buffer the re-encrypted data in memory and write to IDB only after registration succeeds

### 5. `getAllItems` in MemoryStore vs IndexedDBStore inconsistency

**memory-store.ts:26-28** does NOT filter out `deleted_at` items:
```ts
async getAllItems(userId: string): Promise<VaultItem[]> {
  return Array.from(this.items.values()).filter((i) => i.user_id === userId);
}
```

**indexeddb-store.ts:64-67** DOES filter out deleted items:
```ts
async getAllItems(userId: string): Promise<VaultItem[]> {
  const items = await getAllByUserId<VaultItem>(ITEMS_STORE, userId);
  return items.filter((i) => !i.deleted_at);
}
```

**Impact**: Tests using MemoryStore will not catch bugs related to soft-deleted items appearing in results.

---

## Medium Priority

### 6. Credential handler duplicates `getCurrentUserId` logic

**credential-handler.ts:9-12** defines its own `getCurrentUserId()` that reads from `getVaultConfig()`. The auth store has `getCurrentUserId()` on the Zustand store. The background script cannot access Zustand state (different JS context), so duplication is justified, but should be extracted to a shared util to prevent drift.

### 7. `clear(userId?)` on IndexedDBStore clears META_STORE only when no userId

**indexeddb-store.ts:105-131**

When `clear('someUserId')` is called, it only deletes items and folders for that user but leaves metadata (including `last_sync_{userId}` keys) intact. This means after logout+login as a different user, stale sync cursors remain.

**Recommendation**: Also clear metadata keys prefixed with the userId.

### 8. SyncEngine does not push folders

**sync-engine.ts:63-66**

Push always sends `folders: []`. Changed/new folders are never pushed to the server. The `handleEnableSyncConfirm` in settings-page.tsx also sends `folders: []`.

**Impact**: Folder structure is local-only even when sync is enabled.

### 9. `user_id` is required in TypeScript type but not enforced at IDB level

**vault.ts:12** declares `user_id: string` (required), but old IDB records may have `undefined`. The code handles this gracefully with fallback checks (`!item.user_id || item.user_id === userId`), but TypeScript won't warn callers about the mismatch since the type says it's always present.

**Recommendation**: Consider `user_id: string` in the type but document that pre-migration records may lack it, or use `user_id?: string` with a migration note.

### 10. No `sync_queue` cleanup on logout

**auth-store.ts:249-258**

`logout()` clears encryption key, tokens, user info, vault config, and Zustand state, but does NOT clear the sync queue. Stale queue entries tagged with the old userId remain in IDB.

---

## Low Priority

### 11. `settings-page.tsx` exceeds 200-line guideline (338 lines)

Per project rules, files over 200 lines should be modularized. Sync logic (handleSyncNow, handleEnableSyncConfirm) could be extracted to a custom hook.

### 12. Multiple `new IndexedDBStore()` instantiations

credential-handler.ts creates a new `IndexedDBStore()` in each function call (lines 19, 51, 90). While lightweight (just a class with no constructor state), a singleton pattern would be cleaner.

---

## Positive Observations

1. **Consistent userId threading** - All vault CRUD in vault-store.ts correctly calls `getUserId()` before every operation
2. **Per-user sync cursors** - `last_sync_{userId}` metadata key prevents cross-user sync state leakage
3. **Defensive getItem/getFolder** - Returns null if userId doesn't match, preventing cross-user reads
4. **Clean IDB migration** - `onupgradeneeded` handles both fresh installs (oldVersion < 2) and upgrades (oldVersion < 3) correctly with index existence checks
5. **Background script isolation** - credential-handler correctly resolves userId from VaultConfig independently of Zustand
6. **Pulled items tagged** - SyncEngine line 84 tags remote items with current userId before storing
7. **Good test coverage** - Both memory-store and indexeddb-store tests cover cross-user isolation

---

## Recommended Actions (Priority Order)

1. **[Critical]** Add `user_id` validation to `putItem`/`putFolder` -- prevent empty/wrong user_id writes
2. **[Critical]** Add sync queue enqueue to `saveCredential` in credential-handler
3. **[High]** Make `upgradeToOnline` re-encryption atomic (buffer in memory, write after success)
4. **[High]** Gate migration backfill behind metadata flag to avoid repeated full scans
5. **[High]** Fix MemoryStore `getAllItems` to filter `deleted_at` for test parity
6. **[Medium]** Clear sync queue entries on logout
7. **[Medium]** Clear per-user metadata on `clear(userId)`
8. **[Medium]** Implement folder push in SyncEngine

---

## Unresolved Questions

1. Is there an export/import flow that reads items from IDB? If so, does it scope by userId?
2. Should `logout()` call `store.clear(userId)` to remove the user's vault data from IDB, or should it persist for re-login? Current behavior: data persists but becomes inaccessible after VaultConfig is cleared.
3. The `saveCredential` function updates existing items in-place (`store.putItem`) without bumping version or going through vault-store's `updateItem`. Is this intentional?
