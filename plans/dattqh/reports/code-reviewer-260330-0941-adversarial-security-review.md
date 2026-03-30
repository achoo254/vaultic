# Adversarial Security Review — Vaultic Password Manager

**Date:** 2026-03-30
**Reviewer:** code-reviewer (adversarial mode)
**Scope:** Auth bypass chains, data exfiltration, state corruption, crypto weaknesses, supply chain, denial of service

---

## Findings

### ADV-01: Change Password Does Not Invalidate Existing Tokens
- **Category:** auth
- **Severity:** Critical
- **Attack scenario:**
  1. Attacker compromises a user's refresh token (e.g., via XSS on another extension, stolen device)
  2. User changes their password via `PUT /api/v1/auth/password`
  3. Attacker's stolen refresh token still works — `auth-service.ts:refresh()` (line 57-64) only verifies JWT signature and `tokenType`, never checks if the user changed password since token issuance
  4. Attacker calls `POST /api/v1/auth/refresh` with the old refresh token, gets a fresh access token
  5. Attacker continues to access all sync data indefinitely until token naturally expires (7 days)
- **Evidence:** `backend/src/services/auth-service.ts:57-64` — `refresh()` has no password-change epoch check, no token blacklist, no `iat` comparison against a `passwordChangedAt` field
- **Root cause:** No token revocation mechanism exists. The User model has no `passwordChangedAt` or `tokenVersion` field.
- **Verdict:** ACCEPT — must fix. A password change MUST invalidate all existing tokens. Add `tokenVersion` to User model, embed in JWT, check on refresh.

---

### ADV-02: upgradeToOnline Irrecoverable Data Loss on Registration Failure
- **Category:** state
- **Severity:** Critical
- **Attack scenario:**
  1. User has offline vault with 100 credentials encrypted with offline-derived key (random salt)
  2. User calls `upgradeToOnline()` — `auth-store.ts:261-370`
  3. Lines 291-302: ALL items are re-encrypted with the new online-derived key and written to IndexedDB IN-PLACE (overwriting old ciphertext)
  4. Lines 304-318: Registration request fails (server down, email taken, network error)
  5. The function throws at line 317-318
  6. Result: All vault items are now encrypted with the new key, but the old key context (offline salt) is still in VaultConfig. The new key is never stored.
  7. User's vault is PERMANENTLY UNRECOVERABLE — items encrypted with a key nobody can derive (the email-based key was never persisted, and the old salt-based key no longer decrypts anything)
- **Evidence:** `client/apps/extension/src/stores/auth-store.ts:291-318` — re-encryption happens before registration, with no backup or rollback
- **Note:** This overlaps with already-found C2-Ext but the SPECIFIC data loss chain was not documented. The prior finding says "re-encrypts before registration" but does not identify the irrecoverable state.
- **Verdict:** ACCEPT — must fix. Either: (a) re-encrypt AFTER successful registration, or (b) backup old encrypted data and rollback on failure.

---

### ADV-03: Rate Limiter Bypass via IP Spoofing (X-Forwarded-For)
- **Category:** auth/dos
- **Severity:** High
- **Attack scenario:**
  1. Rate limiter in `rate-limit-middleware.ts:12` uses `req.ip` as part of the key
  2. Server uses Express behind nginx (per CLAUDE.md: "PM2 on CentOS 7, nginx")
  3. If `trust proxy` is not configured in Express (not set in `server.ts`), `req.ip` returns the proxy IP — ALL users share one rate limit bucket
  4. If `trust proxy` IS configured, attacker rotates `X-Forwarded-For` header to bypass rate limit entirely
  5. Login endpoint allows 10 attempts per 15 min — with IP rotation, attacker gets unlimited brute-force attempts against the auth_hash
  6. Auth hash is HMAC-SHA256 of an already-hashed value — but the input space is the 64-char hex `auth_hash` sent by clients, which IS guessable if the attacker knows the user's email (they can run Argon2id locally with common passwords)
- **Evidence:** `backend/src/middleware/rate-limit-middleware.ts:12`, `backend/src/server.ts` (no `app.set('trust proxy', ...)`)
- **Compounding factor:** In-memory rate limit store (Map) — resets on server restart, so attacker can also trigger OOM to reset limits
- **Verdict:** ACCEPT — must fix. Set `trust proxy` correctly, add account-level rate limiting (by email, not just by IP), and consider Redis-backed store for production.

---

### ADV-04: Sync Push Allows Overwriting Another User's Items via UUID Collision
- **Category:** auth
- **Severity:** High
- **Attack scenario:**
  1. Sync push in `sync-service.ts:123-141` — when an item ID does NOT exist in the DB for the pushing user, it creates a new document with `_id: item.id`
  2. MongoDB `_id` is globally unique across ALL users
  3. Attacker knows (or guesses) a victim's vault item UUID
  4. Attacker pushes a sync item with the SAME UUID — the `insertOne` at line 125-141 tries to insert with `_id: item.id`
  5. If victim's item already exists with that `_id`, Mongoose throws `E11000 duplicate key error` — this is caught by the error handler and returns 409
  6. BUT: the `VaultItem.find({ _id: { $in: itemIds }, userId })` at line 92 filters by BOTH `_id` AND `userId`. So attacker's userId does not match victim's item — the item is NOT in `existingMap` — code falls through to `insertOne`
  7. The `insertOne` fails with duplicate key because `_id` is globally unique, crashing the entire bulkWrite batch
  8. This means a SINGLE poisoned UUID in a batch of 500 items causes ALL items in that batch to fail silently (bulkWrite partial failure behavior)
- **Evidence:** `backend/src/services/sync-service.ts:89-143` — no try/catch around `bulkWrite`, duplicate `_id` across users not handled
- **Impact:** Targeted DoS — attacker can prevent a specific user from syncing by guessing/enumerating UUIDs, or can disrupt their own sync by replaying known IDs
- **Verdict:** ACCEPT — must fix. Use `ordered: false` in bulkWrite options and handle `BulkWriteError` to accept successful ops and report failed ones, or use compound key `{_id, userId}` instead of global `_id`.

---

### ADV-05: Share Metadata Endpoint Allows Unauthenticated Share Bombing (DoS)
- **Category:** dos
- **Severity:** High
- **Attack scenario:**
  1. `POST /api/v1/shares/metadata` uses `authOptional` — no auth required (`share-route.ts:42`)
  2. No rate limiting on this endpoint (only auth routes have rate limits)
  3. Attacker floods the endpoint with millions of share metadata entries
  4. Each creates a MongoDB document with `userId: "anonymous"` (`share-service.ts:46`)
  5. MongoDB collection grows unbounded — storage exhaustion, slow queries
  6. The `share_id` validation is only `z.string().min(8).max(24)` — attacker can generate unlimited unique IDs
  7. Even with TTL index on `expiresAt`, attacker can set `ttl_hours` to undefined/null, creating shares that never expire
- **Evidence:** `backend/src/routes/share-route.ts:42` (no rate limit), `backend/src/services/share-service.ts:26-48` (no cap on anonymous shares)
- **Verdict:** ACCEPT — must fix. Add rate limiting to share endpoints. Cap total anonymous shares. Require non-null TTL for anonymous shares.

---

### ADV-06: CORS Disabled When CORS_ORIGIN Not Set
- **Category:** auth
- **Severity:** High
- **Attack scenario:**
  1. `server.ts:21` — `origin: process.env["CORS_ORIGIN"]?.split(",") ?? false`
  2. When `CORS_ORIGIN` is not set, `origin` is `false` — this means CORS is DISABLED (no `Access-Control-Allow-Origin` header)
  3. However, `cors` with `origin: false` doesn't mean "block all origins" — it means "don't set the header". Simple requests (POST with `Content-Type: application/json` is NOT simple, so preflight fires) work correctly.
  4. BUT: For GET requests (like `GET /api/v1/shares/:id`, `GET /api/v1/sync/pull`), browsers send them without preflight
  5. If a malicious site triggers `fetch('https://vaultic-server/api/v1/auth/me')` with credentials, the response won't have CORS headers, so JS can't read it — this is correct
  6. HOWEVER: if CORS_ORIGIN is set to `*` (wildcard), all origins are allowed, and authenticated API calls can be made from any website
  7. The real risk: deployment docs don't enforce CORS_ORIGIN, and a misconfigured production instance is fully open
- **Evidence:** `backend/src/server.ts:20-25` — no validation that CORS_ORIGIN is set to a safe value, no warning when unset
- **Verdict:** DEFER — track as issue. The default (`false`) is safe, but the split-by-comma pattern means `*` would be treated as a literal origin string (actually safe). Low practical risk but should document.

---

### ADV-07: Encryption Key Extractable — Any Extension With Storage Access Can Steal It
- **Category:** exfil
- **Severity:** High
- **Attack scenario:**
  1. `session-storage.ts:8-9` — encryption key is exported as raw bytes and stored in `chrome.storage.session` as a plain array: `Array.from(new Uint8Array(exported))`
  2. `kdf.ts:55` — encryption key is created with `extractable: true`
  3. Any code running in the extension context (background script, any loaded module) can call `chrome.storage.session.get('enc_key')` and extract the raw AES-256 key
  4. If a supply chain attack compromises ANY npm dependency loaded into the extension bundle, the attacker gets the master encryption key
  5. Combined with `chrome.storage.local` access (same privilege), attacker gets: encryption key + all JWT tokens + auth hash verifier + vault config including email
  6. This is a COMPLETE vault compromise from a single compromised dependency
- **Evidence:** `client/apps/extension/src/lib/session-storage.ts:6-11`, `client/packages/crypto/src/kdf.ts:55` (extractable: true)
- **Note:** The `extractable: true` comment says "needed for chrome.storage.session export" — this is the root cause. The design requires extractability for persistence, which breaks the WebCrypto non-extractable key protection.
- **Verdict:** ACCEPT — must fix long-term. Short-term: minimize extractability window, audit all dependencies. Long-term: explore using `chrome.storage.session.setAccessLevel('TRUSTED_AND_UNTRUSTED_CONTEXTS')` with non-extractable keys via service worker.

---

### ADV-08: Sync Pull Leaks Item Count and Timing to Device Enumeration
- **Category:** exfil
- **Severity:** Medium
- **Attack scenario:**
  1. `sync-service.ts:161` — Pull query filters out items from the requesting device: `deviceId: { $ne: deviceId }`
  2. Attacker with valid auth can call pull with different `deviceId` values
  3. By varying `deviceId` and observing result count changes, attacker can determine how many devices a user has and when each device last synced
  4. This is an information leak about user's device topology
- **Evidence:** `backend/src/services/sync-service.ts:161`
- **Verdict:** DEFER — low practical impact since attacker already needs valid auth.

---

### ADV-09: No Nonce/Replay Protection on Sync Push
- **Category:** state
- **Severity:** Medium
- **Attack scenario:**
  1. Sync push uses LWW (last-write-wins) based on `updatedAt` timestamp
  2. Attacker intercepts a valid sync push request (MITM or replay from logs)
  3. Attacker replays the exact same push with a future `updatedAt` timestamp
  4. Server accepts it because `new Date(item.updatedAt) > existing.updatedAt`
  5. Attacker can roll back vault items to any previous state by replaying old encrypted payloads with a newer timestamp
  6. No request signing, no nonce, no sequence number — pure timestamp comparison
- **Evidence:** `backend/src/services/sync-service.ts:99`, `backend/src/routes/sync-route.ts:15` (updatedAt is client-controlled datetime string)
- **Compounding:** The `updatedAt` is a client-provided string parsed via `new Date()`. Client can set any future date.
- **Verdict:** ACCEPT — must fix. Add server-side timestamp validation (reject timestamps more than N minutes in the future). Consider adding a monotonic sequence number alongside LWW.

---

### ADV-10: hashForStorage Uses HMAC-SHA256 Instead of Proper Password Hashing
- **Category:** crypto
- **Severity:** Medium
- **Attack scenario:**
  1. `auth-service.ts:7-9` — `hashForStorage(authHash)` = `HMAC-SHA256(jwtSecret, authHash)`
  2. The `authHash` is already derived via Argon2id on the client, so brute-force of the original password is hard
  3. BUT: if the database is compromised, attacker gets `HMAC-SHA256(jwtSecret, authHash)` values
  4. If the JWT_SECRET is also compromised (same server, same env), attacker can compute `HMAC-SHA256(jwtSecret, X)` for candidate auth_hashes
  5. Since auth_hash is a deterministic function of (password, email) — and the auth_hash is a 64-char hex string — the attacker can pre-compute auth_hashes for common passwords + known emails
  6. HMAC-SHA256 is fast (~1 billion ops/sec on GPU) — the server-side "hash" adds no meaningful work factor
  7. All the Argon2id protection is client-side. If an attacker can bypass the client (direct API calls), they only need the auth_hash, and server stores it with a fast hash
- **Evidence:** `backend/src/services/auth-service.ts:7-9`
- **Comparison:** Bitwarden uses PBKDF2 with 100k iterations server-side ON TOP of the client Argon2id
- **Verdict:** DEFER — the threat model assumes server compromise exposes the HMAC key too, making any server-side hashing pointless. But defense-in-depth says add bcrypt/scrypt server-side. Track as improvement.

---

### ADV-11: VaultConfig Password Verifier Enables Offline Brute-Force
- **Category:** crypto
- **Severity:** Medium
- **Attack scenario:**
  1. `auth-store.ts:236` — password verification: `verifier !== config.authHashVerifier`
  2. `auth-store.ts:418-422` — verifier = `SHA256(raw encryption key bytes)`
  3. VaultConfig is stored in `chrome.storage.local` which persists on disk
  4. If attacker gets physical access or disk access, they extract the VaultConfig
  5. VaultConfig contains: `salt` (email or random bytes), `authHashVerifier` (SHA256 of encryption key)
  6. Attacker can now brute-force offline: for each candidate password, run Argon2id(password, salt) -> HKDF -> encryption_key -> SHA256 -> compare with verifier
  7. Argon2id parameters (64MB, 3 iter, 4 parallel) provide ~50ms per attempt — attacker with GPU cluster can try ~200k passwords/hour
  8. This is an inherent trade-off (need verifier for offline unlock), but the verifier should not be the ONLY barrier
- **Evidence:** `client/apps/extension/src/stores/auth-store.ts:418-422`, `client/apps/extension/src/lib/session-storage.ts:103-106`
- **Verdict:** DEFER — inherent to offline-first design. Document the threat model. Consider increasing Argon2id cost for devices that support it.

---

### ADV-12: deleteFolder Race Condition — Items Orphaned Between State Reads
- **Category:** state
- **Severity:** Medium
- **Attack scenario:**
  1. `vault-store.ts:245-267` — `deleteFolder` reads in-memory state at line 256: `get().items.filter(i => i.folder_id === id)`
  2. Between line 256 and the for-loop at 257-261, another operation (e.g., `addItem` from a concurrent tab or sync) could add a NEW item to that folder
  3. The new item would not be in `itemsToUpdate` and would retain the deleted folder's ID
  4. Line 263 reads state AGAIN: `get().items.map(...)` — this second read may include the new item, creating inconsistency between IDB and Zustand state
  5. Result: item in IDB still references deleted folder, UI shows it as unfoldered, next `loadVault()` may show different state
- **Evidence:** `client/apps/extension/src/stores/vault-store.ts:245-267`
- **Verdict:** DEFER — low probability in single-extension context but real race condition.

---

### ADV-13: Content Script fillField Exposes Passwords to Page JavaScript
- **Category:** exfil
- **Severity:** Medium
- **Attack scenario:**
  1. `field-filler.ts:22-24` — after setting the input value, dispatches `input`, `change`, `keydown`, `keyup` events
  2. These events bubble up to `document` and are observable by ANY JavaScript on the page
  3. A malicious page (or compromised third-party script on a legitimate page) can:
     ```js
     document.addEventListener('input', (e) => {
       if (e.target.type === 'password') exfiltrate(e.target.value);
     });
     ```
  4. The password is exposed in plaintext in the DOM input value — this is inherent to autofill
  5. BUT: the `keydown`/`keyup` events at line 24-25 are dispatched with `key: 'a'` — this is misleading to keyloggers (minor), but the real password is in the input value
  6. The 50ms delay between username and password fill (`field-filler.ts:42`) creates a window where username is filled but password isn't — observable timing side channel
- **Evidence:** `client/apps/extension/src/content/field-filler.ts:22-25, 42`
- **Note:** This is inherent to ALL autofill implementations. However, Vaultic should document this in its threat model.
- **Verdict:** DEFER — inherent to autofill. Document in security policy.

---

## Summary Table

| ID | Category | Severity | Verdict | Description |
|----|----------|----------|---------|-------------|
| ADV-01 | auth | Critical | ACCEPT | Password change doesn't invalidate tokens |
| ADV-02 | state | Critical | ACCEPT | upgradeToOnline irrecoverable data loss on failure |
| ADV-03 | auth/dos | High | ACCEPT | Rate limiter bypassable via IP spoofing + no account-level limiting |
| ADV-04 | auth/dos | High | ACCEPT | Sync push UUID collision crashes entire batch |
| ADV-05 | dos | High | ACCEPT | Unauthenticated share metadata endpoint — unbounded resource creation |
| ADV-06 | auth | High | DEFER | CORS misconfiguration risk |
| ADV-07 | exfil | High | ACCEPT | Encryption key extractable + stored as raw bytes in chrome.storage |
| ADV-08 | exfil | Medium | DEFER | Sync pull leaks device topology |
| ADV-09 | state | Medium | ACCEPT | No replay protection on sync push — timestamp rollback attack |
| ADV-10 | crypto | Medium | DEFER | Server-side hash is fast HMAC, no additional work factor |
| ADV-11 | crypto | Medium | DEFER | Offline brute-force via stored verifier |
| ADV-12 | state | Medium | DEFER | deleteFolder race between state reads |
| ADV-13 | exfil | Medium | DEFER | Autofill exposes password to page JS |

**ACCEPT (must fix before production):** ADV-01, ADV-02, ADV-03, ADV-04, ADV-05, ADV-07, ADV-09 (7 issues)
**DEFER (track as known risk):** ADV-06, ADV-08, ADV-10, ADV-11, ADV-12, ADV-13 (6 issues)

---

## Recommended Fix Priority

1. **ADV-01** (Critical) — Add `tokenVersion` to User model, embed in JWT, increment on password change. Check on every refresh.
2. **ADV-02** (Critical) — Refactor `upgradeToOnline` to backup old ciphertext, re-encrypt after successful registration, or use a two-phase commit pattern.
3. **ADV-05** (High) — Add rate limiting to share endpoints. Require TTL for anonymous shares. Cap total anonymous shares per IP.
4. **ADV-03** (High) — Configure `trust proxy`, add per-email rate limiting on login/register, consider external rate limiter.
5. **ADV-04** (High) — Use `bulkWrite({ ordered: false })` and handle `BulkWriteError`. Consider compound `{_id, userId}` uniqueness.
6. **ADV-09** (Medium) — Reject `updatedAt` timestamps more than 5 minutes in the future. Add monotonic counter.
7. **ADV-07** (High) — Long-term architecture decision. Short-term: audit all dependencies, use lockfile integrity checks, consider SRI.

---

**Status:** DONE
**Summary:** Found 13 new security issues (7 ACCEPT, 6 DEFER). Most critical: password change doesn't revoke tokens (ADV-01) and upgradeToOnline can permanently destroy vault data (ADV-02).
**Concerns:** ADV-01 and ADV-02 are production-blocking. ADV-03+ADV-05 are exploitable by unauthenticated attackers.
