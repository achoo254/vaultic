# Code Review: Auto Cloud Sync Implementation

**Date:** 2026-03-30
**Reviewer:** code-reviewer
**Scope:** 9 files (modified + new), ~500 LOC net change
**Focus:** Correctness, security, race conditions, API contracts, edge cases

## Overall Assessment

Solid implementation. The architecture (factory singleton, mutex, alarm backoff, SYNC_NOW message routing) is well-designed. Found **2 critical**, **3 high**, and several medium issues.

---

## Critical Issues

### C1. Device ID divergence between popup and background service worker

**File:** `client/packages/sync/src/device.ts`

The `getDeviceId()` uses `localStorage` with an in-memory fallback. The background service worker cannot access `localStorage`, so it generates a new `memoryDeviceId` each time the SW restarts. The popup/content script reads from `localStorage`. This means:

- **Push from popup** sends device_id = "abc" (localStorage)
- **Push from background** (alarm sync) sends device_id = "xyz" (in-memory, regenerated on SW wake)
- **Pull** excludes `deviceId: { $ne: deviceId }` on the server — so the background will pull back items it just pushed (because the device_id doesn't match), creating ghost duplicates or unnecessary writes

**Impact:** Data duplication on pull, wasted bandwidth, potential conflict resolution bugs.

**Fix:** Use `chrome.storage.local` as the persistent store for device ID instead of `localStorage`. Both popup and service worker contexts can access `chrome.storage.local`. Make `getDeviceId()` async, or initialize it at module load and cache.

```typescript
// device.ts — use chrome.storage.local for cross-context persistence
let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  const { vaultic_device_id } = await chrome.storage.local.get('vaultic_device_id');
  if (vaultic_device_id) { cachedId = vaultic_device_id; return cachedId; }
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ vaultic_device_id: id });
  cachedId = id;
  return id;
}
```

Note: This changes the signature to async, requiring updates in callers (`vault-store.ts` line 151, `credential-handler.ts` line 176).

---

### C2. Pagination pulls folders only once, items paginated — folders may be lost on large syncs

**File:** `backend/src/services/sync-service.ts`, lines 124-128

The `pull()` function paginates **items** (with `limit + 1` and `has_more`), but folders are fetched **once without limit or cursor** on every pull call. On the client side (`sync-engine.ts` line 127-135), the pagination loop calls `pull()` multiple times, each server call re-fetches ALL folders matching `since`. This causes:

1. **Duplicate folder processing** — same folders returned on every page
2. **No pagination for folders** — if a user has 1000+ folders, they all come in one query
3. **Folder cursor not advanced** — `cursor` param only filters items, not folders

**Impact:** Duplicate folder writes to IDB (benign due to putFolder idempotency), but wasted bandwidth and processing. Large folder counts could hit response size limits.

**Fix (backend):** Either include folders only in the first page (when `cursor` is null), or paginate folders separately.

---

## High Priority

### H1. `fetchWithAuth` returns `res.json()` promise from a non-ok check that already threw

**File:** `client/apps/extension/src/lib/create-sync-engine.ts`, lines 31-32

```typescript
const res = await fetchWithAuth('/api/v1/sync/push', { ... });
return res.json();
```

`fetchWithAuth` already throws on non-ok responses (line 44-46 of `fetch-with-auth.ts`). But the `apiAdapter.push()` calls `res.json()` on the returned Response. If the server returns a 200 with malformed JSON, this silently produces `undefined` or throws an unrelated parse error that propagates as a push failure — triggering backoff instead of a clear error.

**Fix:** Add response validation:
```typescript
const data = await res.json();
if (!data.accepted_items || !data.accepted_folders) {
  throw new Error('Invalid push response');
}
return data;
```

### H2. Mutex is instance-level, but factory cache can be invalidated

**File:** `client/apps/extension/src/lib/create-sync-engine.ts`

If `createSyncEngine('user1')` is called, then `createSyncEngine('user2')`, then `createSyncEngine('user1')` again — a **new** SyncEngine is created for user1 (cache only holds one entry). Two instances for user1 can now sync concurrently since `_isSyncing` is per-instance.

**Impact:** Low probability (userId rarely changes within a session), but if it does — concurrent syncs could push/pull simultaneously causing partial state.

**Fix:** Use a `Map<string, SyncEngine>` cache instead of a single-slot cache. Or, since this is a password manager where only one user is active, explicitly invalidate old engines.

### H3. Sync alarm handler ignores vault lock state

**File:** `client/apps/extension/src/entrypoints/background/sync-alarm-handler.ts`

`handleSyncAlarm()` checks `sync_enabled` and `navigator.onLine` but does NOT check if the vault is locked. When the vault is locked, the encryption key is cleared from session storage. If sync runs while locked:

- **Push:** reads items from IDB (encrypted, ok), pushes to server (ok — already encrypted)
- **Pull:** writes remote items to IDB (ok — already encrypted)

Actually, push/pull work with encrypted blobs so this is functionally safe. But: `fetchWithAuth` requires a valid JWT token. If the session expired while locked, the refresh may fail, triggering unnecessary backoff escalation.

**Impact:** Medium — wasteful API calls and backoff escalation when user is idle with locked vault and expired tokens.

**Recommendation:** Check vault lock state before syncing; skip with early return if locked.

---

## Medium Priority

### M1. `serverTime` saved as empty string on zero pull results

**File:** `client/packages/sync/src/sync-engine.ts`, line 176

If the pagination loop gets zero pages (e.g., server returns empty first page with `has_more: false`), `serverTime` remains `''` (line 124). Line 176 then saves `''` as `last_sync_${userId}`. On next sync, `lastSync = ''` is passed as `since` — the server receives `since=''` which may parse as epoch or invalid date.

**Fix:** Only save `serverTime` if it's a non-empty string:
```typescript
if (serverTime) await this.store.setMetadata(lastSyncKey, serverTime);
```

### M2. `triggerSyncNow()` in vault-store sends message without checking SW availability

**File:** `client/apps/extension/src/stores/vault-store.ts`, line 22

The `.catch(() => {})` swallows all errors silently. This is intentional (fire-and-forget), but if the service worker is inactive, Chrome will wake it — potentially causing the SW to initialize without the alarm being set (if `initSyncAlarm` hasn't run yet). The `SYNC_NOW` handler calls `handleSyncAlarm()` directly which re-checks `sync_enabled`, so this is safe. No action needed, but worth noting.

### M3. `handleEnableSyncConfirm` in use-sync-settings runs sync in popup context

**File:** `client/apps/extension/src/components/settings/use-sync-settings.ts`, lines 79-94

When user enables sync, `handleEnableSyncConfirm` creates a SyncEngine in the **popup context** and runs `.sync()`. The popup can close at any time (user clicks elsewhere). If sync is interrupted mid-push or mid-pull:

- Pushed items may be partially cleared from queue
- Pull metadata (`last_sync_`) may not be updated
- No data loss (items remain in IDB), but queue state may be inconsistent

**Fix:** Route initial sync through background SW via `SYNC_NOW` message instead of running in popup. Show syncing state via `chrome.storage.local` listener.

### M4. Conflict resolution tie goes to local (LWW resolver returns local when equal)

**File:** `client/packages/sync/src/conflict-resolver.ts`, line 15

When `localTime === remoteTime`, the resolver returns `local`. Combined with sync-engine line 146-148 (`if (winner.updated_at === tagged.updated_at)` — checking if remote won), equal timestamps mean remote is NOT applied. This is correct for LWW but worth documenting: if two devices edit at the same millisecond, the first-to-pull wins and the other's changes are silently dropped.

### M5. `deleteFolder` triggers sync then orphans items — race with sync

**File:** `client/apps/extension/src/stores/vault-store.ts`, lines 263-287

`deleteFolder` enqueues the folder delete, triggers sync, THEN updates items to remove `folder_id`. If sync fires immediately (before the item updates), the server may receive the folder deletion but items still reference the deleted folder.

**Fix:** Move `triggerSyncNow()` to after the item updates are complete.

---

## Low Priority

### L1. `consecutiveFailures` resets on SW restart

**File:** `client/apps/extension/src/entrypoints/background/sync-alarm-handler.ts`, line 10

`consecutiveFailures` is module-level `let`. Chrome kills and restarts the SW frequently. On restart, failures reset to 0, and the alarm recreates at BASE_INTERVAL. This means backoff is ineffective across SW restarts. Acceptable trade-off for simplicity, but could persist to `chrome.storage.local` if aggressive backoff is needed.

### L2. `fromApiItem` defaults `item_type` to `1` (magic number)

**File:** `client/apps/extension/src/lib/sync-api-transforms.ts`, line 38

`item_type: item.itemType ?? 1` uses a magic number. Should reference `ItemType.Login` for clarity.

---

## Positive Observations

1. **Clean mutex pattern** — `sync()` / `_doSync()` separation with try/finally is correct
2. **Pagination safety cap** (MAX_PAGES=50) prevents infinite loops
3. **Fire-and-forget pattern** for CRUD sync triggers is appropriate — doesn't block UI
4. **User-scoped sync** — all operations correctly scope by userId
5. **Backoff strategy** is sound (exponential with cap)
6. **Factory singleton** prevents duplicate SyncEngine instances in normal flow
7. **API transform layer** cleanly separates client/server naming conventions

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix device ID persistence to use `chrome.storage.local` — current implementation guarantees divergent IDs between popup and SW
2. **[CRITICAL]** Fix folder pagination — either deduplicate on client or include folders only on first page
3. **[HIGH]** Validate push/pull API response shapes in adapter
4. **[HIGH]** Route initial sync (enable + unlock) through background SW, not popup
5. **[MEDIUM]** Guard against empty `serverTime` being saved
6. **[MEDIUM]** Move `triggerSyncNow()` after item updates in `deleteFolder`
7. **[LOW]** Replace magic number in `fromApiItem`

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Implementation is architecturally sound but has a critical device ID divergence bug (C1) that will cause pull to re-download items pushed from background context. Folder pagination (C2) causes duplicate processing. Both should be fixed before merge.
**Concerns:** C1 (device ID) is a production data correctness issue. C2 is a performance/correctness issue under scale.
