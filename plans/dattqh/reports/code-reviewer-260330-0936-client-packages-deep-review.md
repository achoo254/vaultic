# Code Review: Vaultic Client Packages

**Date:** 2026-03-30
**Scope:** `client/packages/crypto`, `storage`, `sync`, `api`, `ui` + `shared/types`
**Files reviewed:** 30+ source + test files
**Focus:** Security, correctness, production-readiness

---

## Overall Assessment

The codebase is well-structured, cleanly separated into focused packages, and follows good conventions. However, there are several **security-critical** and **correctness** issues that need attention before this is production-trustworthy for a zero-knowledge password manager.

---

## CRITICAL Issues (Blocking)

### C1. No master key material cleanup after derivation
**File:** `client/packages/crypto/src/kdf.ts`
**Severity:** CRITICAL (security)

`deriveMasterKey()` returns an `ArrayBuffer` containing the raw master key. Neither this function nor `deriveKeys()` zeroes the intermediate `masterKey` buffer after deriving sub-keys. In JavaScript, `ArrayBuffer` contents persist in memory until GC collects them — which could be seconds to minutes.

For a zero-knowledge password manager, key material lingering in memory is a tangible attack surface (memory dumps, cold boot, extension crash dumps).

**Impact:** Master key recoverable from memory dump.

**Fix:**
```typescript
export async function deriveKeys(password: string, email: string): Promise<DerivedKeys> {
  const masterKey = await deriveMasterKey(password, email);
  try {
    const [encryption_key, auth_hash] = await Promise.all([
      deriveEncryptionKey(masterKey),
      deriveAuthHash(masterKey),
    ]);
    return { encryption_key, auth_hash };
  } finally {
    // Zero out master key material
    new Uint8Array(masterKey).fill(0);
  }
}
```

Note: JavaScript cannot guarantee full cleanup (compiler copies, GC timing), but explicit zeroing is industry standard practice and significantly reduces the exposure window.

---

### C2. HKDF with empty salt weakens key derivation
**File:** `client/packages/crypto/src/kdf.ts:49`
**Severity:** CRITICAL (crypto design)

Both `deriveEncryptionKey()` and `deriveAuthHash()` use `salt: new Uint8Array(0)` (empty salt). Per RFC 5869, when salt is not provided, HKDF uses a string of `HashLen` zeroes. While technically valid, for a password manager:

- The salt should incorporate user-specific context (e.g., email or user ID) to prevent pre-computation attacks on the HKDF step
- If two users somehow derive the same master key (collision), they'd get identical encryption keys

**Impact:** Reduced key independence between HKDF-derived sub-keys. Not immediately exploitable, but violates defense-in-depth for a crypto product.

**Fix:** Use `new TextEncoder().encode(email)` as the HKDF salt (requires passing email through the call chain). This must be coordinated with the Rust `vaultic-crypto` crate to maintain compatibility.

---

### C3. Sync engine has ZERO error handling — silent data loss risk
**File:** `client/packages/sync/src/sync-engine.ts`
**Severity:** CRITICAL (data integrity)

The `sync()` method has no try/catch anywhere. If `api.push()` fails mid-sync:
1. Queue entries already read via `dequeueAll()` are not re-enqueued
2. The pull phase is skipped entirely
3. No error status is reported — caller gets an unhandled rejection

If `api.pull()` fails after items are partially applied:
1. `lastSync` cursor is never updated (good), but partially-written items remain in the store
2. Next sync will re-pull the same items, potentially creating duplicates or overwriting local edits made between syncs

**Impact:** Network errors during sync can silently lose queued changes or corrupt local state.

**Fix:** Wrap push and pull in separate try/catch blocks. Return `status: 'error'` on failure. Do NOT clear queue entries until push is confirmed:
```typescript
async sync(): Promise<SyncResult> {
  // ... offline check ...
  let pushed = 0, pulled = 0, conflicts = 0;

  try {
    // Push phase
    const pending = await this.queue.dequeueAll(this.userId);
    if (pending.length > 0) {
      // ... build items ...
      const result = await this.api.push({ ... });
      // Only clear ACCEPTED entries
      const acceptedIds = pending
        .filter(p => result.accepted_items.includes(p.item_id))
        .map(p => p.id);
      await this.queue.clear(acceptedIds);
      pushed = result.accepted_items.length;
      conflicts = result.conflicts.length;
    }
  } catch (err) {
    // Push failed — queue is untouched (dequeueAll is read-only)
    return { status: 'error', pushed: 0, pulled: 0, conflicts: 0 };
  }

  try {
    // Pull phase
    // ... same as current ...
  } catch (err) {
    return { status: 'error', pushed, pulled: 0, conflicts };
  }

  return { status: 'idle', pushed, pulled, conflicts };
}
```

---

### C4. `dequeueAll` is a misleading name — it reads but does not dequeue
**File:** `client/packages/storage/src/indexeddb-sync-queue.ts:19`
**Severity:** CRITICAL (correctness / data loss)

`dequeueAll()` opens a `readonly` transaction and returns all entries. It does NOT delete them. The actual deletion happens in `clear()` called later. But the name strongly implies destructive read — and crucially, `SyncEngine.sync()` relies on this being non-destructive (it only clears accepted entries).

If any future developer sees `dequeueAll` and assumes it already removed entries, they won't call `clear()`, causing infinite re-sync loops. Conversely, if someone "fixes" it to actually dequeue, the sync engine will lose unaccepted entries.

**Impact:** API contract mismatch — name promises "dequeue" but delivers "peek". Leads to bugs in maintenance.

**Fix:** Rename to `peekAll(userId)` or `getPending(userId)` to match actual behavior.

---

## IMPORTANT Issues (High Priority)

### H1. `putItem` does not enforce userId ownership — cross-user data overwrite
**File:** `client/packages/storage/src/indexeddb-store.ts:53`
**Severity:** HIGH (data isolation)

`putItem(item)` and `putFolder(folder)` write directly to the store without checking that `item.user_id` matches any expected user. Any caller can overwrite any user's item by providing the same `id` with a different `user_id`.

While `getItem` checks userId, the write path has no guard. In a multi-account scenario, a bug in the sync engine (or a malicious server response during pull) could overwrite UserA's item with UserB's data.

**Impact:** userId-based isolation is read-only; writes bypass it entirely.

**Fix:** Either:
- Add a `userId` parameter to `putItem`/`putFolder` and validate `item.user_id === userId`
- Or perform a read-before-write check (current `getItem` + compare)

---

### H2. IndexedDB `openDB()` caches promise but never handles connection loss
**File:** `client/packages/storage/src/indexeddb-open.ts`
**Severity:** HIGH (production reliability)

`openDB()` caches the `dbPromise` singleton. If the DB connection is later closed (by the browser, by `clear()` calling `db.close()` on line 128 of indexeddb-store.ts, or by `onversionchange` events), all subsequent operations will use the stale closed connection and fail silently or throw.

Specifically: `clear()` without userId calls `db.close()` — but `dbPromise` still points to the closed connection. Next call to `openDB()` returns the closed DB.

**Impact:** After a full `clear()`, all subsequent DB operations fail.

**Fix:**
```typescript
// In clear() — after db.close(), reset the cache:
tx.oncomplete = () => { db.close(); resetDBCache(); resolve(); };
```

Also consider adding `db.onclose` and `db.onversionchange` handlers in `openDB()` to auto-reset the cache.

---

### H3. No token refresh / 401 retry in API client
**File:** `client/packages/api/src/client.ts`
**Severity:** HIGH (UX / reliability)

The API client attaches JWT tokens via `onRequest` interceptor, but there is no `onResponseError` handler for 401 responses. When an access token expires (15-minute lifetime per CLAUDE.md), every API call will fail until the user manually triggers a refresh.

For a password manager extension that runs in the background, this means sync will silently fail for hours.

**Impact:** Sync stops working after 15 minutes without user interaction.

**Fix:** Add `onResponseError` interceptor that:
1. Catches 401 responses
2. Calls `AuthApi.refresh()` with the stored refresh token
3. Retries the original request with the new access token
4. If refresh also fails (expired refresh token), triggers a re-login flow

---

### H4. LWW conflict resolver uses string comparison on ISO timestamps
**File:** `client/packages/sync/src/conflict-resolver.ts:12`
**Severity:** HIGH (correctness)

```typescript
return remote.updated_at > local.updated_at ? remote : local;
```

This works for ISO 8601 strings with matching timezone offsets (lexicographic order matches chronological order). But if one timestamp has `+00:00` and another has `Z`, or if one uses milliseconds and the other doesn't:
- `"2026-01-01T00:00:00Z"` < `"2026-01-01T00:00:00+00:00"` (string comparison)
- But they represent the same instant

**Impact:** Incorrect conflict resolution with inconsistent timestamp formats.

**Fix:**
```typescript
resolve(local: SyncItem, remote: SyncItem): SyncItem {
  const localTime = new Date(local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();
  return remoteTime > localTime ? remote : local;
}
```

---

### H5. Password generator does not guarantee character class inclusion
**File:** `client/packages/crypto/src/password-gen.ts`
**Severity:** MEDIUM-HIGH (UX / security expectations)

When a user enables uppercase + lowercase + digits + symbols and requests a 4-character password, `generatePassword` randomly picks from the combined charset. It does NOT guarantee at least one character from each selected class. A user expecting "must contain uppercase" may get `"aaaa"`.

Many password policies require at least one char from each enabled class. Users will blame the tool when generated passwords are rejected by websites.

**Impact:** Generated passwords may fail site-specific password policies.

**Fix:** After generating random chars, verify at least one from each enabled class. If not, replace random positions with chars from missing classes. Or: place one guaranteed char from each enabled class first, then fill remaining positions randomly, then shuffle.

---

### H6. `decryptBytes` does not validate minimum ciphertext length
**File:** `client/packages/crypto/src/cipher.ts:71-84`
**Severity:** MEDIUM (robustness)

`decrypt()` checks `data.length < NONCE_SIZE + 16` but `decryptBytes()` does not. Passing a short or empty `ArrayBuffer` to `decryptBytes` will create an empty `ciphertext` slice and pass it to WebCrypto, which may throw an opaque error instead of a clear "ciphertext too short" message.

**Fix:** Add the same length check as `decrypt()`.

---

## MEDIUM Issues

### M1. Share API `shareId` is user-controlled and interpolated into URL path
**File:** `client/packages/api/src/share-api.ts:20,24,28`

```typescript
return this.client(`/api/v1/shares/${shareId}`);
```

If `shareId` contains path traversal characters (e.g., `../admin/users`), this could construct unintended URLs. While ofetch's `baseURL` joining should prevent escaping the API domain, the path itself could hit unintended server routes.

**Fix:** Validate `shareId` matches expected format (e.g., UUID or alphanumeric) before interpolation, or use `encodeURIComponent(shareId)`.

---

### M2. Sync engine does not handle pagination from pull response
**File:** `client/packages/sync/src/sync-engine.ts:80`

`SyncPullResponse` has `has_more` and `next_cursor` fields, but `SyncEngine.sync()` only pulls once. If there are more items than one page, they're silently ignored until the next sync cycle — but `lastSync` is updated to `server_time`, so those items may never be pulled.

**Impact:** Data loss when server has more than one page of changes.

**Fix:** Loop the pull until `has_more === false`:
```typescript
let cursor: string | undefined;
do {
  const delta = await this.api.pull(lastSync, deviceId, cursor);
  // ... process items ...
  cursor = delta.next_cursor;
  await this.store.setMetadata(lastSyncKey, delta.server_time);
} while (delta.has_more && cursor);
```

---

### M3. `SyncApi.pull()` does not pass `since` correctly to `SyncEngine`
**File:** `client/packages/sync/src/sync-engine.ts` vs `client/packages/api/src/sync-api.ts`

`SyncEngine` calls `this.api.pull(lastSync, deviceId)` — positional args `(since, deviceId)`. But `SyncApiAdapter` interface expects `pull(since: string | null, deviceId: string)` while the actual `SyncApi.pull()` takes a single object `{ deviceId, since?, ... }`.

These are two different APIs: the adapter interface uses positional args, the real `SyncApi` uses named params. The `SyncApi` class does NOT implement `SyncApiAdapter` directly — it's a structural mismatch. The caller must provide an adapter layer, but this is not documented or enforced.

**Impact:** Confusion and likely runtime error if `SyncApi` is passed directly as `SyncApiAdapter`.

---

### M4. No test coverage for KDF, URL share codec, sync engine, or IndexedDB sync queue
**Severity:** MEDIUM (quality)

Missing tests:
- `kdf.ts` — no tests at all (the most critical crypto module)
- `url-share-codec.ts` — no tests
- `sync-engine.ts` — no tests (the most complex logic module)
- `indexeddb-sync-queue.ts` — no tests

The cipher and password-gen tests are good, but the KDF is arguably more important — it's the foundation of the entire crypto chain, and it must match the Rust implementation exactly.

---

### M5. `VaultItem.user_id` is required in type but optional in runtime
**File:** `shared/types/src/vault.ts:12` vs `client/packages/storage/src/indexeddb-store.ts:50`

The `VaultItem` interface declares `user_id: string` (required), but `IndexedDBStore.getItem()` checks `!item.user_id` for pre-migration compatibility. This means the runtime can have items where `user_id` is `undefined` despite the type saying it's always present.

**Fix:** Either make `user_id` optional in the type (`user_id?: string`) to reflect reality, or ensure migration backfills existing records.

---

## MINOR Issues

### L1. `getAll<T>` helper is unused in production code
**File:** `client/packages/storage/src/indexeddb-store.ts:38`

`getAll()` (unfiltered) is defined but only used by `getAllItemsUnfiltered()` and `getAllFoldersUnfiltered()` — which themselves exist only for migration/debug. Consider marking these clearly as internal/debug APIs.

### L2. `withStore` opens DB on every call
Each IDB operation calls `openDB()` separately. While `openDB()` caches the promise, the pattern of opening a new transaction per operation means no batching. For `clear(userId)`, this results in: N reads (via `getAllByUserId`) + 1 transactional delete — acceptable but worth noting.

### L3. `SyncItem.item_type` is `number` but `VaultItem.item_type` is `ItemType` (enum string)
**File:** `shared/types/src/sync.ts:7` vs `shared/types/src/vault.ts:8`

Type mismatch between sync transport format and local storage format. The sync engine casts `VaultItem` to `SyncItem` implicitly — a string enum value will be stored where a number is expected.

---

## Positive Observations

1. **Crypto primitives are solid** — AES-256-GCM with random nonces, proper nonce||ciphertext format, rejection sampling for password gen (no modulo bias)
2. **Clean package boundaries** — each package has a focused responsibility, proper interface exports
3. **IndexedDB migration strategy** — v2 to v3 migration is well-structured with conditional index creation
4. **Type-safe interfaces** — `VaultStore` and `SyncQueue` interfaces properly decouple storage from implementation
5. **userId isolation on read path** — `getItem`, `getAllItems`, `getFolder` all properly filter by userId
6. **Design tokens** — comprehensive, well-organized, enforced as single source of truth

---

## Recommended Actions (Priority Order)

1. **[C3]** Add error handling to SyncEngine.sync() — data loss risk
2. **[C1]** Zero master key material after sub-key derivation
3. **[H2]** Fix `openDB()` cache invalidation after `clear()` closes DB
4. **[H1]** Add userId validation to `putItem`/`putFolder` writes
5. **[H3]** Implement 401 retry with token refresh in API client
6. **[H4]** Use `Date.getTime()` for timestamp comparison in LWW resolver
7. **[M2]** Handle pagination in sync pull
8. **[M4]** Add tests for KDF, sync engine, URL codec, sync queue
9. **[C4]** Rename `dequeueAll` to `peekAll` or `getPending`
10. **[C2]** Evaluate HKDF salt strategy (coordinate with Rust crate)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | ~95% (minimal `as` casts, only in tests) |
| Test Coverage | ~50% (crypto cipher/pwgen good; KDF, sync engine, codec untested) |
| Linting Issues | Not run (no lint config reviewed) |
| Security Issues | 3 critical, 2 high |
| Data Integrity Issues | 3 critical/high |

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Client packages have solid architecture and clean code, but contain critical issues in crypto key cleanup, sync error handling, and storage isolation that must be fixed before production use.
**Concerns:** Items C1-C4, H1-H4 are real production risks for a password manager. The sync engine is the most dangerous — zero error handling + misleading API names + no pagination = data loss scenarios.
