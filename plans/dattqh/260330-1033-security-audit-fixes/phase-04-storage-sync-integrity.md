# Phase 4: Storage & Sync Integrity

## Context Links
- [Client Packages Audit](../reports/code-reviewer-260330-0936-client-packages-deep-review.md)
- [Adversarial Review](../reports/code-reviewer-260330-0941-adversarial-security-review.md)

## Overview
- **Priority:** P1 + P2 (URGENT — sync is LIVE)
- **Status:** Completed
- **Effort:** 3h
- **Parallel-safe:** Yes — owns `client/packages/storage/src/**`, `client/packages/sync/src/**`

## Items Covered

| # | ID | Severity | Issue |
|---|-----|----------|-------|
| 10 | P-H1 | P1 | Add userId check on putItem/putFolder write operations |
| 11 | P-C3 | P2 | Add error handling to sync engine |
| 12 | P-H4 | P2 | Parse timestamps as Date for LWW comparison |
| 14 | P-H2 | P2 | Reset dbPromise after clear() |

## Key Insights

- **Sync is LIVE with real users** — these fixes are urgent
- `putItem`/`putFolder` accept any item regardless of user_id — write-side isolation is missing
- `SyncEngine.sync()` has ZERO try/catch — network failure silently loses queued changes
- LWW resolver does string comparison on timestamps — `"Z"` vs `"+00:00"` gives wrong results
- `clear()` calls `db.close()` but never resets `dbPromise` cache — subsequent ops fail silently

## Related Code Files

### Files to Modify
- `client/packages/storage/src/indexeddb-store.ts` — add userId validation to putItem/putFolder
- `client/packages/storage/src/indexeddb-open.ts` — reset dbPromise after clear() closes db
- `client/packages/sync/src/sync-engine.ts` — add error handling to sync()
- `client/packages/sync/src/conflict-resolver.ts` — use Date.getTime() for comparison
- `client/packages/storage/src/indexeddb-sync-queue.ts` — rename dequeueAll to getPending

### Files to Create
- None

---

## Implementation Steps

### Item 10: userId Check on Write Operations (P-H1)

File: `client/packages/storage/src/indexeddb-store.ts`

**Problem:** `putItem(item)` at line 53 writes directly without checking user_id. A malicious server response or sync bug could overwrite another user's data.

**Fix: Add userId parameter to putItem/putFolder**

```typescript
async putItem(item: VaultItem): Promise<void> {
  // Validate user_id is set — required for multi-account isolation
  if (!item.user_id) {
    throw new Error('putItem requires item.user_id to be set');
  }
  // Check if item already exists with different user_id
  const existing = await withStore<VaultItem | undefined>(
    ITEMS_STORE, 'readonly', (s) => s.get(item.id),
  );
  if (existing && existing.user_id && existing.user_id !== item.user_id) {
    throw new Error('Cannot overwrite item belonging to different user');
  }
  await withStore(ITEMS_STORE, 'readwrite', (s) => s.put(item));
}

async putFolder(folder: Folder): Promise<void> {
  if (!folder.user_id) {
    throw new Error('putFolder requires folder.user_id to be set');
  }
  const existing = await withStore<Folder | undefined>(
    FOLDERS_STORE, 'readonly', (s) => s.get(folder.id),
  );
  if (existing && existing.user_id && existing.user_id !== folder.user_id) {
    throw new Error('Cannot overwrite folder belonging to different user');
  }
  await withStore(FOLDERS_STORE, 'readwrite', (s) => s.put(folder));
}
```

**Note:** This adds a read-before-write. Acceptable for correctness. For bulk operations (sync pull), this means N extra reads — acceptable for current scale.

**Impact on VaultStore interface:** The `VaultStore` interface in `vault-store.ts` already declares `putItem(item: VaultItem): Promise<void>` — no signature change needed. The validation is implementation-level.

---

### Item 11: Sync Engine Error Handling (P-C3)

File: `client/packages/sync/src/sync-engine.ts`

**Wrap push and pull in separate try/catch blocks. Return error status on failure.**

```typescript
async sync(): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
  }

  const deviceId = getDeviceId();
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  // 1. Push pending local changes
  try {
    const pending = await this.queue.getPending(this.userId);
    if (pending.length > 0) {
      const itemIds = new Set(pending.map((p) => p.item_id));
      const items: VaultItem[] = [];
      for (const id of itemIds) {
        const item = await this.store.getItem(this.userId, id);
        if (item) items.push(item);
      }

      const result = await this.api.push({
        device_id: deviceId,
        items,
        folders: [],
      });

      // Only clear ACCEPTED entries from queue
      const acceptedIds = pending
        .filter((p) => result.accepted_items.includes(p.item_id))
        .map((p) => p.id);
      if (acceptedIds.length > 0) {
        await this.queue.clear(acceptedIds);
      }
      pushed = result.accepted_items.length;
      conflicts = result.conflicts.length;
    }
  } catch (pushErr) {
    // Push failed — queue untouched, items will retry next sync
    console.error('[SyncEngine] Push failed:', pushErr);
    return { status: 'error', pushed: 0, pulled: 0, conflicts: 0 };
  }

  // 2. Pull remote changes
  try {
    const lastSyncKey = `last_sync_${this.userId}`;
    const lastSync = await this.store.getMetadata(lastSyncKey);
    const delta = await this.api.pull(lastSync, deviceId);

    for (const remoteItem of delta.items) {
      const tagged = { ...remoteItem, user_id: this.userId } as VaultItem;
      const local = await this.store.getItem(this.userId, remoteItem.id);
      if (local) {
        const winner = this.resolver.resolve(
          { id: local.id, encrypted_data: local.encrypted_data, version: local.version, updated_at: local.updated_at },
          { id: tagged.id, encrypted_data: tagged.encrypted_data, version: tagged.version, updated_at: tagged.updated_at },
        );
        if (winner.updated_at === tagged.updated_at) {
          await this.store.putItem(tagged);
        }
      } else {
        await this.store.putItem(tagged);
      }
    }

    for (const id of delta.deleted_ids) {
      await this.store.deleteItem(this.userId, id);
    }

    pulled = delta.items.length + delta.deleted_ids.length;
    await this.store.setMetadata(lastSyncKey, delta.server_time);
  } catch (pullErr) {
    console.error('[SyncEngine] Pull failed:', pullErr);
    return { status: 'error', pushed, pulled: 0, conflicts };
  }

  return { status: 'idle', pushed, pulled, conflicts };
}
```

Key changes:
- Push and pull wrapped in separate try/catch
- Push failure returns error immediately — queue entries preserved for retry
- Pull failure returns error with push count preserved
- `console.error` for debugging (extension background console)
- `status: 'error'` added to SyncResult (need to update SyncStatus type)

**Update SyncStatus type:**
File: `shared/types/src/sync.ts` (or wherever SyncStatus is defined)
Add `'error'` to the union: `type SyncStatus = 'idle' | 'syncing' | 'error';`

---

### Item 12: Fix LWW Timestamp Comparison (P-H4)

File: `client/packages/sync/src/conflict-resolver.ts`

```typescript
// Change:
export class LWWResolver implements ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem {
    return remote.updated_at > local.updated_at ? remote : local;
  }
}

// To:
export class LWWResolver implements ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem {
    const localTime = new Date(local.updated_at).getTime();
    const remoteTime = new Date(remote.updated_at).getTime();
    return remoteTime > localTime ? remote : local;
  }
}
```

This properly handles timezone differences (`Z` vs `+00:00`), millisecond precision differences, and any ISO 8601 variant.

---

### Item 14: Reset dbPromise After clear() (P-H2)

File: `client/packages/storage/src/indexeddb-open.ts`

The `resetDBCache()` function already exists at line 63. The issue is that `IndexedDBStore.clear()` (without userId) calls `db.close()` at line 128 of `indexeddb-store.ts` but never resets the cache.

**Fix in indexeddb-store.ts:**
```typescript
// In clear() method, line 127-128:
// Change:
tx.oncomplete = () => { db.close(); resolve(); };
// To:
tx.oncomplete = () => {
  db.close();
  resetDBCache();  // Reset cached promise so next openDB() creates fresh connection
  resolve();
};
```

Add import at top of `indexeddb-store.ts`:
```typescript
import { openDB, ITEMS_STORE, FOLDERS_STORE, META_STORE, resetDBCache } from './indexeddb-open';
```

**Also rename dequeueAll to getPending:**

File: `client/packages/storage/src/indexeddb-sync-queue.ts`
```typescript
// Rename method:
async getPending(userId: string): Promise<SyncQueueEntry[]> {
  // ... same implementation ...
}
```

File: `client/packages/storage/src/sync-queue.ts` (interface)
Update the `SyncQueue` interface to use `getPending` instead of `dequeueAll`.

File: `client/packages/sync/src/sync-engine.ts`
Update the call: `this.queue.getPending(this.userId)` (already shown in Item 11 fix above).

---

## Todo List

- [x] Add user_id validation to `putItem()` — reject if missing or cross-user overwrite (indexeddb-store.ts)
- [x] Add user_id validation to `putFolder()` — same pattern (indexeddb-store.ts)
- [x] Wrap push phase in try/catch, return error status (sync-engine.ts)
- [x] Wrap pull phase in try/catch, return error status (sync-engine.ts)
- [x] Add `'error'` to SyncStatus type (shared/types)
- [x] Fix LWW resolver: use `new Date().getTime()` for comparison (conflict-resolver.ts)
- [x] Import `resetDBCache` in indexeddb-store.ts
- [x] Call `resetDBCache()` after `db.close()` in `clear()` (indexeddb-store.ts)
- [x] Rename `dequeueAll` to `getPending` in sync-queue interface + implementation
- [x] Update sync-engine.ts to call `getPending` instead of `dequeueAll`
- [x] Run `tsc --noEmit` for storage and sync packages
- [x] Run `pnpm test` for storage and sync packages

## Success Criteria

1. `putItem({ user_id: 'user-B' })` on existing item owned by user-A throws error
2. Network failure during sync push preserves queue entries for retry
3. Network failure during sync pull doesn't update lastSync cursor
4. `"2026-01-01T00:00:00Z"` and `"2026-01-01T00:00:00+00:00"` compare as equal in LWW
5. `clear()` followed by any vault operation works (no stale DB connection)
6. `tsc --noEmit` passes, `pnpm test` passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| putItem validation breaks sync pull (items from server lack user_id) | Medium | High | Sync engine already tags items with `user_id: this.userId` before putItem — this is safe |
| Error status from sync not handled by caller (settings page) | Medium | Low | Caller should display sync error — add UI handling in Phase 5 if needed |
| Renaming dequeueAll breaks external callers | Low | Medium | Only sync-engine.ts calls it; update the interface |
| resetDBCache race condition with concurrent operations | Low | Low | clear() is destructive and rare — concurrent ops during clear are already broken |

## Security Considerations

- userId validation on writes prevents cross-user data contamination from malicious server responses
- Error handling prevents silent data loss during sync failures
- Correct LWW comparison prevents wrong conflict resolution with timezone-variant timestamps

## Next Steps

- Monitor sync error rates after deployment
- Consider adding sync retry with exponential backoff
- Phase 5 may add sync pagination support (`has_more` / `next_cursor`)
