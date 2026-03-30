# Security Audit Fix Review

**Date:** 2026-03-30 | **Reviewer:** code-reviewer | **Branch:** main (uncommitted)
**Scope:** 18 audit findings across 5 phases | **Files reviewed:** 25+

---

## Executive Summary

**Overall: INCOMPLETE — 7 of 18 items NOT implemented, 2 partially implemented, 2 new issues introduced.**

The client-side fixes (Phase 2, Phase 5) are mostly well-done. However, **the entire backend security phase (Phase 1) was NOT implemented** despite tasks being marked as completed. This means all P0 backend findings remain open.

---

## Item-by-Item Verification

### P0 — Production Blockers

| # | ID | Finding | Status | Details |
|---|-----|---------|--------|---------|
| 1 | E-C1 | auth_hash stored in chrome.storage | **FIXED** | `storeAuthHashVerifier` no longer called in register/login/upgrade flows. Legacy migration reads remain for backward compat. `computeVerifier(SHA256(key bytes))` replaces raw auth_hash. |
| 2 | E-C2/ADV-02 | upgradeToOnline re-encrypts before register | **FIXED** | `upgrade-to-online.ts` correctly does: verify password -> register -> login -> re-encrypt. Server call precedes vault mutation. |
| 3 | B-C1/ADV-01 | tokenVersion for token revocation | **NOT IMPLEMENTED** | `tokenVersion` absent from user-model.ts, jwt-utils.ts, auth-service.ts, auth-middleware.ts. Zero code changes in backend. Password change still returns only `{ message: "password updated" }` without new tokens. |
| 4 | B-C4 | AUTH_HASH_KEY separate from JWT_SECRET | **NOT IMPLEMENTED** | `hashForStorage()` at auth-service.ts:8 still uses `envConfig.jwtSecret`. No `AUTH_HASH_KEY` in env-config.ts. No lazy rehash logic. |
| 5 | ADV-07 | Non-extractable CryptoKey | **PARTIAL** | kdf.ts and session-storage.ts correctly use `false` (non-extractable). **BUT** `crypto-helpers.ts:9` in background worker imports with `true` (extractable), completely negating the fix. See NEW-01 below. |

### P1 — Security Hardening

| # | ID | Finding | Status | Details |
|---|-----|---------|--------|---------|
| 6 | E-C5 | Content script on `<all_urls>` | **NOT FIXED** | content.ts:9 still has `matches: ['<all_urls>']`. Should be `['http://*/*', 'https://*/*']`. |
| 7 | E-H3 | Domain matching via `url.includes()` | **NOT FIXED** | credential-handler.ts:31 still does `url.includes(extractDomain(cred.url))`. Substring match allows `evil-example.com` to match credentials for `example.com`. |
| 8 | B-H2 | Trust proxy for nginx | **NOT IMPLEMENTED** | server.ts has no `app.set('trust proxy', 1)`. Rate limiter remains broken behind reverse proxy. |
| 9 | B-C2 | Registration TOCTOU | **NOT IMPLEMENTED** | auth-service.ts:24-25 still does `findOne` then `create` — concurrent registrations can create duplicate accounts. |
| 10 | P-H1 | userId check on writes | **PARTIAL** | `getItem`/`getFolder`/`deleteItem`/`deleteFolder` correctly check userId. But `putItem`/`putFolder` accept any item without validating the caller's userId matches `item.user_id`. |

### P2 — Data Integrity

| # | ID | Finding | Status | Details |
|---|-----|---------|--------|---------|
| 11 | P-C3 | Sync engine error handling | **FIXED** | sync-engine.ts has proper try/catch structure. `navigator.onLine` check added. Queue clearing scoped to accepted items. |
| 12 | P-H4 | LWW string timestamp comparison | **FIXED** | conflict-resolver.ts:12 compares `updated_at` strings. For ISO 8601 strings, lexicographic comparison is correct — no change needed and none applied. |
| 13 | ADV-04 | bulkWrite ordered:false + error handling | **NOT IMPLEMENTED** | sync-service.ts:49,60 call `bulkWrite(ops as any)` without `{ ordered: false }` and without try/catch for BulkWriteError. |
| 14 | P-H2 | dbPromise reset after clear() | **FIXED** | indexeddb-open.ts:63 exports `resetDBCache()`. indexeddb-store.ts clear() closes db in line 128. |

### P3 — Code Quality

| # | ID | Finding | Status | Details |
|---|-----|---------|--------|---------|
| 15 | - | Modularize large files | **FIXED** | auth-store.ts split into auth-server-actions.ts + upgrade-to-online.ts. sync-service.ts split into sync-ops-builders.ts. settings-page split into helpers + hook. |
| 16 | - | Design tokens for hardcoded colors | **FIXED** | export-vault.tsx, settings-page.tsx, share-page.tsx now use `tokens.*` and `useTheme()` colors. |
| 17 | - | DRY duplicate utilities | **FIXED** | encoding-utils.ts consolidates base64/verifier. escape-html.ts used across content scripts. |
| 18 | - | itemType default mismatch | **NOT FIXED** | sync-ops-builders.ts:136 still has `item.itemType ?? 1` instead of `item.itemType ?? 'login'`. |

---

## New Issues Introduced

### NEW-01 [CRITICAL] — Background worker negates non-extractable key fix

**File:** `client/apps/extension/src/entrypoints/background/crypto-helpers.ts:9`
```typescript
{ name: 'AES-GCM' }, true, ['encrypt', 'decrypt'],
//                     ^^^^  extractable = true
```

While `session-storage.ts:29` correctly imports with `false`, the background worker's `getEncKey()` function re-imports the raw bytes with `extractable: true`. Since `getEncKey()` is used in credential-handler.ts for all autofill/save operations, the encryption key remains extractable in the background context, defeating ADV-07.

**Fix:** Change `true` to `false` on line 9 of crypto-helpers.ts.

### NEW-02 [MEDIUM] — Encryption key raw bytes exposed in chrome.storage.session

**File:** `session-storage.ts:8-10`
```typescript
await chrome.storage.session.set({
  enc_key: Array.from(new Uint8Array(rawBytes)),
});
```

The raw key bytes are stored as a JSON array in session storage. While `getEncryptionKey()` imports them as non-extractable, any code with access to `chrome.storage.session` can read the raw byte array directly. The non-extractable CryptoKey is a defense-in-depth measure, but the raw material is still accessible in storage. This is an inherent limitation of the approach — noted for awareness.

### NEW-03 [LOW] — Deprecated `storeAuthHashVerifier` still exported

**File:** `session-storage.ts:97`

Marked `@deprecated` but still exported. Could be accidentally called by future code. Consider making it non-exported or removing it after verifying no legacy data needs migration.

### NEW-04 [MEDIUM] — `storeEncryptionKey` (extractable variant) still exported

**File:** `session-storage.ts:15-18`

The legacy `storeEncryptionKey()` function requires an extractable CryptoKey and is still exported. If called instead of `storeEncryptionKeyBytes()`, it would fail with non-extractable keys from the updated KDF. But it could also be misused to store an extractable key. Consider removing.

---

## Summary Scorecard

| Category | Fixed | Partial | Not Fixed | Total |
|----------|-------|---------|-----------|-------|
| P0 (items 1-5) | 2 | 1 | 2 | 5 |
| P1 (items 6-10) | 0 | 1 | 4 | 5 |
| P2 (items 11-14) | 3 | 0 | 1 | 4 |
| P3 (items 15-18) | 3 | 0 | 1 | 4 |
| **Total** | **8** | **2** | **8** | **18** |

---

## Blocking Issues (Must Fix Before Release)

1. **[CRITICAL] Phase 1 backend entirely missing** — tokenVersion, AUTH_HASH_KEY, trust proxy, TOCTOU fix, bulkWrite error handling. All 5 backend items (#3, #4, #8, #9, #13) need implementation.
2. **[CRITICAL] crypto-helpers.ts extractable:true** — negates non-extractable key fix (NEW-01). Single-line fix.
3. **[HIGH] Content script matches `<all_urls>`** — item #6, runs on chrome://, file:// pages.
4. **[HIGH] Domain matching substring vulnerability** — item #7, allows credential theft via subdomain spoofing.
5. **[MEDIUM] itemType default still `1`** — item #18, data type mismatch between client and server.

---

## What Was Done Well

- **upgradeToOnline reorder** (E-C2) — correctly sequences register -> login -> re-encrypt, with password verification before any mutation
- **auth_hash removal** (E-C1) — clean replacement with SHA-256 verifier, legacy migration path maintained
- **Non-extractable keys in KDF** — proper `deriveBits` -> import pattern with `extractable: false`
- **escape-html utility** — properly used in autofill-icon, save-banner, inline-add-form (XSS prevention)
- **Code modularization** — auth-store, sync-service, settings-page all under 200 lines with clean extraction
- **encoding-utils consolidation** — DRY across auth-store, share-crypto, upgrade-to-online
- **dbPromise reset** — properly exported for test/production reset

---

## Recommended Action Plan

### Immediate (before any commit)
1. Fix `crypto-helpers.ts:9`: change `true` to `false`
2. Fix `content.ts:9`: change `<all_urls>` to `['http://*/*', 'https://*/*']`
3. Fix `sync-ops-builders.ts:136`: change `1` to `'login'`

### Next Sprint (Phase 1 backend)
4. Implement tokenVersion in user-model, jwt-utils, auth-service, auth-middleware
5. Add AUTH_HASH_KEY with lazy rehash in auth-service
6. Add `app.set('trust proxy', 1)` in server.ts
7. Replace findOne+create with try/catch E11000 in register()
8. Add `ordered: false` and BulkWriteError handling to bulkWrite calls

### Follow-up
9. Fix domain matching in credential-handler.ts (strict equality, not substring)
10. Add userId validation to putItem/putFolder in VaultStore interface

---

**Status:** DONE_WITH_CONCERNS
**Summary:** 8/18 audit items verified fixed, 2 partial, 8 not implemented. Entire backend phase missing despite being marked complete. One new critical issue found (extractable key in background worker).
**Concerns:** Phase 1 tasks (#1-#5 in task list) are marked "completed" but no backend code was changed. This suggests task tracking does not reflect actual implementation state.
