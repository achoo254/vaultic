# Code Review: Phase 5 — Vault CRUD & Sync

**Score: 7/10**

## Scope
- **Files**: 20 files across `packages/storage`, `packages/sync`, `packages/extension`
- **LOC**: ~1200
- **Focus**: IndexedDB storage, sync engine, Zustand vault store, vault UI components

## Overall Assessment
Solid offline-first architecture. Encryption flow is correct (encrypt-before-store, decrypt-on-load). Clean separation between storage interface, sync engine, and UI. Several data integrity and security edge cases need addressing.

---

## Critical Issues

### C1. DB Version Conflict — IndexedDB store vs sync queue
**Files**: `indexeddb-store.ts` (DB_VERSION=1), `indexeddb-sync-queue.ts` (DB_VERSION=2)

Both files call `indexedDB.open('vaultic', ...)` with different versions. If `indexeddb-store.ts` opens first with v1, then `indexeddb-sync-queue.ts` opens with v2, it triggers `onupgradeneeded` and recreates stores. But if `indexeddb-sync-queue.ts` opens first (v2), then `indexeddb-store.ts` tries to open with v1 — **this silently opens v2 without triggering upgrade, which works**. However, the duplicated schema in two files is fragile. If a future version bump in one file doesn't match the other, data loss is possible.

**Fix**: Single `openDB()` function in a shared module with one DB_VERSION constant. Both classes import from it.

### C2. IndexedDB Connection Leak
**File**: `indexeddb-store.ts` lines 39-53

`withStore()` opens a new DB connection for every operation. `tx.oncomplete` closes the DB, but if the `fn(store)` IDBRequest errors, the `request.onerror` rejects BUT `tx.oncomplete` or `tx.onerror` may still fire after `db.close()` was never called (error path has no close). Additionally, opening a new connection per operation is wasteful.

**Fix**: Use a singleton connection with lazy init. Always close in a `finally`-equivalent pattern:
```ts
let dbInstance: IDBDatabase | null = null;
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB();
  return dbInstance;
}
```

### C3. Sync Engine Deletes Without Soft-Delete Check
**File**: `sync-engine.ts` line 98

`delta.deleted_ids` triggers `this.store.deleteItem(id)` which hard-deletes from IndexedDB. But if the user made local changes to that item since last sync, those changes are silently lost. No conflict check for delete-vs-update.

**Fix**: Before deleting, check if local item has changes newer than the server delete timestamp. If so, surface conflict or keep local version.

---

## High Priority

### H1. No Error Propagation in loadVault
**File**: `vault-store.ts` lines 98-100

Top-level `catch {}` swallows all errors silently. If IndexedDB is corrupt, quota exceeded, or encryption key is wrong for some items, user sees empty vault with no indication of failure.

**Fix**: Add an `error` field to VaultState. Set it in catch block. Show user-facing error in UI.

### H2. deleteFolder Doesn't Persist Item Updates to IndexedDB
**File**: `vault-store.ts` lines 206-212

`deleteFolder` updates in-memory Zustand state to clear `folder_id` on items, but never writes those updated items back to IndexedDB. On next `loadVault()`, items still reference the deleted folder.

**Fix**:
```ts
deleteFolder: async (id) => {
  const key = await getEncryptionKey();
  if (!key) throw new Error('Vault is locked');
  // Update items in IDB
  const allItems = await store.getAllItems();
  for (const item of allItems.filter(i => i.folder_id === id)) {
    await store.putItem({ ...item, folder_id: undefined, updated_at: new Date().toISOString() });
  }
  await store.deleteFolder(id);
  // ...update state
},
```

### H3. Password Visible in Form Input
**File**: `vault-item-form.tsx` line 78

Password input uses `type="text"` — password visible in plaintext while typing/editing. Shoulder-surfing risk.

**Fix**: Use `type="password"` with a toggle button (like `PasswordField` component already does for display).

### H4. Clipboard Auto-Clear Race Condition
**File**: `copy-button.tsx` line 19

`setTimeout(() => navigator.clipboard.writeText(''), 30000)` — if user copies another value within 30s, the first timer still fires and clears the new clipboard content. Multiple rapid copies create multiple timers.

**Fix**: Store timer ref and clear previous timer on new copy:
```ts
const timerRef = useRef<number>();
const handleCopy = async () => {
  clearTimeout(timerRef.current);
  await navigator.clipboard.writeText(text);
  timerRef.current = window.setTimeout(() => navigator.clipboard.writeText(''), 30000);
};
```

### H5. addFolder Missing Sync Queue Entry
**File**: `vault-store.ts` lines 190-204

`addFolder` persists to IndexedDB but does NOT enqueue a sync queue entry. When cloud sync runs, new folders won't be pushed to server.

**Fix**: Add `syncQueue.enqueue(...)` after `store.putFolder(folder)`.

---

## Medium Priority

### M1. getChangedSince Full Table Scan
**File**: `indexeddb-store.ts` lines 83-86

`getChangedSince` loads ALL items then filters in JS. Has an `updated_at` index but doesn't use it. With large vaults (1000+ items), this is wasteful.

**Fix**: Use IDB index with cursor/keyRange:
```ts
async getChangedSince(timestamp: number): Promise<VaultItem[]> {
  // Use IDBKeyRange.lowerBound on 'updated_at' index
}
```

### M2. Password Generator Doesn't Auto-Regenerate on Toggle Change
**File**: `password-generator-view.tsx` lines 58-61

Changing toggles (uppercase, lowercase, etc.) updates state but doesn't regenerate the password. The displayed password doesn't reflect new settings until user clicks "Regenerate". The slider (line 54) calls `regenerate()` but it uses stale closure values since state hasn't updated yet.

**Fix**: Use `useEffect` to regenerate when any option changes:
```ts
useEffect(() => { regenerate(); }, [regenerate]);
```

### M3. Suggested Items URL Matching Too Loose
**File**: `vault-list.tsx` line 40

`i.credential.url?.includes(currentHost)` — if `currentHost` is "git.com", it matches "digit.com", "legit.company.com", etc. Substring match is imprecise.

**Fix**: Parse stored URL into hostname and do exact hostname comparison (or suffix match for subdomains).

### M4. LWW Resolver Tie-Breaking
**File**: `conflict-resolver.ts` line 12

When `remote.updated_at === local.updated_at`, local wins (by `>` comparison). This is fine but should be documented. In edge cases with clock skew, this could lead to inconsistency across devices.

### M5. VaultStore Interface Missing getMetadata/setMetadata
**File**: `vault-store.ts` (interface) doesn't include metadata methods, but `SyncEngine` requires them via intersection type. This works but is brittle.

**Fix**: Add metadata methods to the `VaultStore` interface or create a separate `MetadataStore` interface.

### M6. device_id Empty String on addItem
**File**: `vault-store.ts` line 117

`device_id: ''` — should use `getDeviceId()` from `@vaultic/sync` for proper device tracking during sync.

---

## Low Priority

### L1. Emoji Icons Instead of Lucide Icons
Design spec says "Icons: Lucide (outlined, strokeWidth 1.5)" but all components use emoji (search-bar, bottom-nav, vault-item-card, etc.). Not blocking but inconsistent with design system.

### L2. Inline Styles Throughout
All components use `React.CSSProperties` objects. Works fine for extension context but no hover/focus states possible. Consider CSS modules or Tailwind for interactive states.

### L3. Missing Debounce on Search
**File**: `search-bar.tsx` — every keystroke triggers state update and re-filter. Fine for small vaults, may lag with 500+ items. Low priority for MVP.

### L4. `loadVault` in useEffect Dependency
**File**: `vault-list.tsx` line 28 — `loadVault` is listed as dependency but is a stable Zustand action. Harmless but could confuse linters.

---

## Edge Cases Found by Scout

1. **DB open race**: Two simultaneous `openDB()` calls (e.g., `putItem` + `enqueue` in parallel) each open a separate connection. Not a bug but wastes resources.
2. **Empty credential name**: `vault-item-form.tsx` validates `name.trim()` but `vault-item-card.tsx` line 14 calls `charAt(0)` — empty string returns empty string, harmless but no fallback avatar.
3. **Sync during lock**: If vault locks mid-sync (auto-lock timer fires), `getEncryptionKey()` returns null. Sync engine doesn't use encryption key directly, but any subsequent decrypt will fail silently.
4. **deleteItem soft-delete + getAllItems filter**: `getAllItems` filters `deleted_at` items, but `getChangedSince` does NOT filter them. This means sync push could include already-deleted items in the changed set.

---

## Positive Observations

- Clean storage abstraction with `VaultStore` interface + `MemoryStore` for testing
- Proper encrypt-before-store pattern, no plaintext in IndexedDB
- Encryption key in `chrome.storage.session` (cleared on browser close) — correct security model
- Soft-delete pattern for sync compatibility
- Proper error boundaries in decrypt loops (skip corrupted items)
- Good offline check in sync engine (`navigator.onLine`)
- AES-256-GCM with random nonce per encryption — correct crypto usage
- Clipboard auto-clear after 30s — good security practice (needs timer fix)

---

## Recommended Actions (Priority Order)

1. **Unify IndexedDB schema** — single `openDB` with one DB_VERSION (C1)
2. **Fix deleteFolder persistence** — write folder_id changes back to IDB (H2)
3. **Add folder sync queue entry** — `addFolder` must enqueue for sync (H5)
4. **Fix clipboard timer race** — use ref to clear previous timer (H4)
5. **Add error state to vault store** — surface failures to user (H1)
6. **Fix password input type** — use `type="password"` in form (H3)
7. **Add delete-vs-update conflict check** in sync engine (C3)
8. **Singleton DB connection** — reduce connection overhead (C2)
9. **Use IDB index for getChangedSince** (M1)
10. **Set device_id properly** on item creation (M6)

## Metrics
- Type Coverage: ~85% (some implicit `any` via catch blocks, intersection types)
- Test Coverage: MemoryStore exists for testing; no test files found for Phase 5 yet
- Linting Issues: Not run (build log shows successful compilation)

## Unresolved Questions
1. Should `getChangedSince` exclude soft-deleted items, or is including them intentional for sync push?
2. Is the current LWW tie-break (local wins) the desired behavior, or should version number be a secondary tiebreaker?
3. Will folder sync be implemented in Phase 5 or deferred? Currently sync engine pushes `folders: []` always.
