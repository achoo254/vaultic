# Final Security Audit Verification — 18 Items

**Date:** 2026-03-30
**Reviewer:** code-reviewer
**Scope:** All 18 audit items from security review

---

## Results: 18/18 PASS

### Phase 1 — Backend

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | `user-model.ts` — tokenVersion field | **PASS** | L10: `tokenVersion: number` in IUser, L25: `{ type: Number, default: 0 }` in schema |
| 2 | `jwt-utils.ts` — tokenVersion in payload, HS256 pinned | **PASS** | L6: `tokenVersion` in TokenPayload, L14/L21: tokenVersion in sign payloads, L15/L22/L28: `algorithm: "HS256"` / `algorithms: ["HS256"]` |
| 3 | `auth-service.ts` — tokenVersion in login/refresh/changePassword, AUTH_HASH_KEY + lazy rehash, TOCTOU fix | **PASS** | L68-69: tokenVersion in login tokens. L85-86: refresh validates tokenVersion vs DB. L123: `tokenVersion = (user.tokenVersion ?? 0) + 1` in changePassword. L11: `hashForStorage` uses `envConfig.authHashKey` by default. L56: lazy rehash checks legacy jwtSecret key. L28-44: register uses `User.create()` directly + catches 11000 duplicate key (no findOne TOCTOU) |
| 4 | `auth-middleware.ts` — tokenVersion DB check | **PASS** | L26-29: fetches user from DB, compares `payload.tokenVersion !== user.tokenVersion`, throws "token revoked" |
| 5 | `env-config.ts` — authHashKey field | **PASS** | L8: `authHashKey: requireEnv("AUTH_HASH_KEY")` — required, crashes on missing |
| 6 | `server.ts` — trust proxy 1 | **PASS** | L16: `app.set('trust proxy', 1)` |
| 7 | `sync-service.ts` + `sync-ops-builders.ts` — ordered:false, MongoBulkWriteError catch, itemType fallback | **PASS** | L64/L82 sync-service: `{ ordered: false }`. L66-69/L84-89: catch block handles partial write errors. L136 sync-ops-builders: `itemType: item.itemType ?? 'login'` |

### Phase 2 — Extension Auth & Crypto

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 8 | `kdf.ts` — extractable: false, deriveEncryptionKeyWithBytes | **PASS** | L70: `false` (non-extractable) in importKey. L46-74: `deriveEncryptionKeyWithBytes()` returns `{ key, rawBytes }`. L129: `deriveKeys()` uses this variant and returns `rawKeyBytes` |
| 9 | `session-storage.ts` — storeEncryptionKeyBytes, getEncryptionKey non-extractable | **PASS** | L7-11: `storeEncryptionKeyBytes(rawBytes)` stores byte array. L29: `false` (non-extractable) in `getEncryptionKey()` importKey call |
| 10 | `auth-store.ts` — no storeAuthHashVerifier calls, uses rawKeyBytes | **PASS** | No active `storeAuthHashVerifier` calls in store files (only comments). `auth-server-actions.ts` L29/L76: uses `rawKeyBytes` from `deriveKeys()`. L105: `storeEncryptionKeyBytes(rawKeyBytes)`. `auth-store.ts` L94/L109: offline path uses `rawBytes` from `deriveEncryptionKeyWithBytes()` |

### Phase 3 — Content Scripts

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 11 | `content.ts` — matches http/https only | **PASS** | L9: `matches: ['http://*/*', 'https://*/*']` — no wildcard `<all_urls>` |
| 12 | `credential-handler.ts` — domain strict equality, no password in matches, fillCredentialById | **PASS** | L31: `extractDomain(url) === extractDomain(cred.url)` strict equality. L33: matches return `{ id, name, username }` only — no password. L48-86: `fillCredentialById()` decrypts in background, injects via scripting API — password never crosses message boundary |
| 13 | `background.ts` — FILL_CREDENTIAL handler | **PASS** | L46-49: `case 'FILL_CREDENTIAL'` calls `fillCredentialById(msg.credentialId, tabId)` |
| 14 | `export-vault.tsx` — JSON label, no 'encrypted' | **PASS** | L74: label is `JSON (.json)`. L75: hint is `Plaintext`. No misleading "encrypted" export option. Both formats show unencrypted warning |

### Phase 4 — Storage & Sync

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 15 | `indexeddb-store.ts` — putItem/putFolder userId validation, resetDBCache in clear() | **PASS** | L54-56: putItem throws if `!item.user_id`. L60-61: blocks cross-user overwrite. L96-104: putFolder same pattern. L146: `resetDBCache()` called in full clear path |
| 16 | `sync-engine.ts` — try/catch push/pull, getPending call | **PASS** | L52-80: push in try/catch, returns error status on failure. L83-116: pull in separate try/catch, returns error status on failure. L53: `this.queue.getPending(this.userId)` |
| 17 | `conflict-resolver.ts` — Date.getTime() comparison | **PASS** | L12-13: `new Date(local.updated_at).getTime()` and `new Date(remote.updated_at).getTime()` — numeric comparison, not string |

### Phase 5 — Extras

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 18 | `crypto-helpers.ts` — extractable: false | **PASS** | L9: `false` in `crypto.subtle.importKey()` — non-extractable CryptoKey |

---

## Overall Score: **18/18 PASS**

All security audit items verified in code. No regressions found.

### Minor observations (non-blocking)

1. `authOptional` middleware (auth-middleware.ts L42-59) does NOT validate tokenVersion against DB — acceptable since it's optional auth, but worth noting: a revoked token will still set `req.userId` until JWT expiry.
2. `getSuccessfulIds()` in sync-service.ts always returns `[]` on bulk write error — conservative but means partial successes are retried. Acceptable trade-off documented in comments.
3. `storeAuthHashVerifier` function still exported from session-storage.ts (marked `@deprecated`) — consider removing entirely in a future cleanup pass to prevent accidental use.
