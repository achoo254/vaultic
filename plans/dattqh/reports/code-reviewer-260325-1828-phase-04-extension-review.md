# Code Review: Phase 4 — Extension Shell & Auth

**Date:** 2025-03-25 | **Score: 7/10** | **LOC:** ~830

## Scope

- `packages/crypto/src/` — kdf.ts, cipher.ts, index.ts, password-gen.ts
- `packages/types/src/` — user.ts, crypto.ts
- `packages/extension/src/` — popup, background, auth store, session storage, auth components
- `packages/extension/` — wxt.config.ts, package.json

## Overall Assessment

Solid implementation of crypto bridge and auth flows. Offline-first unlock works correctly. Session storage strategy (enc_key in session, tokens in local) is sound. Several security and interop issues need attention.

---

## Critical Issues

### C1. Encryption key exported as extractable for storage
**File:** `session-storage.ts:7` + `kdf.ts:54`
- `deriveEncryptionKey()` creates key with `extractable: false`, but `storeEncryptionKey()` calls `exportKey('raw', key)` which requires extractable keys.
- This will throw a runtime `DOMException: The CryptoKey is not extractable` at login/register.
- **Fix:** Change `kdf.ts:54` from `false` to `true` in `deriveKey()` call, OR restructure to store raw bytes before importing as non-extractable CryptoKey.

### C2. Unlock has no password verification
**File:** `auth-store.ts:87-95`
- `unlock()` derives keys from password and stores them — but never validates the password is correct. A wrong password silently produces wrong keys; decryption only fails later when vault items are accessed.
- User sees "unlocked" state with garbage keys.
- **Fix:** Store a known encrypted sentinel (e.g., encrypt a fixed string at registration) in `chrome.storage.local`. On unlock, decrypt the sentinel; if decryption fails, reject with "Wrong password."

### C3. Argon2id salt encoding mismatch — potential interop break
**File:** `kdf.ts:21-30` vs `kdf.rs:34-37`
- Rust `hash_password_into(password, email, &mut key)` takes raw bytes: `password.as_bytes()` / `email.as_bytes()`.
- hash-wasm's `argon2id({ password, salt: email })` — when `password` and `salt` are strings, hash-wasm UTF-8 encodes them. This should match Rust for ASCII emails/passwords.
- **Risk:** If email contains non-ASCII characters (international domains, e.g., `user@example.com` with Unicode), encoding differences could produce different keys between TS and Rust. Rust uses `&[u8]` from the string literal; hash-wasm uses its own UTF-8 encoder.
- **Fix:** Explicitly pass `Uint8Array` via `new TextEncoder().encode()` for both `password` and `salt` to guarantee consistent UTF-8. Add interop test with non-ASCII input.

---

## High Priority

### H1. `storeEncryptionKey` stores raw key bytes in chrome.storage.session
**File:** `session-storage.ts:8-10`
- Key material stored as `Array.from(new Uint8Array(exported))` — a plain JSON array of integers. Any extension with `storage` permission or debugger access can read it.
- `chrome.storage.session` is scoped to the extension and not synced, which is good. But `setAccessLevel` is not set to `TRUSTED_AND_UNTRUSTED_CONTEXTS` restriction.
- **Fix:** Call `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })` in background.ts on startup. This is a defense-in-depth measure.

### H2. API_BASE_URL hardcoded with fallback in each form
**Files:** `login-form.tsx:7`, `register-form.tsx:7`
- `import.meta.env.VITE_API_URL || 'http://localhost:8080'` duplicated in both files.
- Fallback to `http://` in production would send auth_hash over plaintext.
- **Fix:** Extract to shared config module. Remove `http://localhost` fallback or restrict it to dev builds only (`import.meta.env.DEV`).

### H3. Register does double key derivation
**File:** `auth-store.ts:42-62`
- `register()` calls `deriveKeys()`, then calls `login()` which calls `deriveKeys()` again. Argon2id with 64MB/3 iterations is expensive (~1-2s). User waits ~2-4s on register.
- **Fix:** Pass derived keys to login or refactor to avoid redundant derivation.

### H4. `password-gen.ts` doesn't guarantee character class coverage
**File:** `password-gen.ts:25-38`
- If `uppercase`, `digits`, and `symbols` are all enabled, the generated password may not contain at least one of each category. Pure random selection from the combined charset.
- **Fix:** Guarantee at least one character from each enabled class, then fill remaining length randomly. Shuffle the result.

---

## Medium Priority

### M1. Popup routing has redundant useEffect hooks
**File:** `app.tsx:30-54`
- Two separate `useEffect` blocks handle nearly identical routing logic. The first runs once after hydration; the second reacts to state changes. They can be merged.
- The first `useEffect` checks `email !== undefined` which is always true since initial state is `null` (and `null !== undefined`).

### M2. No rate limiting on unlock attempts
**File:** `lock-screen.tsx` / `auth-store.ts:87`
- Unlimited unlock attempts with no delay. Enables local brute-force if attacker has physical access.
- **Fix:** Add exponential backoff after N failed attempts (e.g., 5). Store attempt count in session.

### M3. Background auto-lock: no initial activity timestamp
**File:** `background.ts:46`
- `lastActivity` defaults to `0` if never set. On first alarm check after extension install, `Date.now() - 0` is always > 15min, so vault locks immediately if a key exists.
- Mostly harmless since key won't exist before first login. But after a service worker restart mid-session, activity timestamp may be lost.
- **Fix:** Set `last_activity_at = Date.now()` when storing enc_key (in `storeEncryptionKey`).

### M4. `decryptBytes` missing minimum length check
**File:** `cipher.ts:71-84`
- `encrypt()` and `decrypt()` check `data.length < NONCE_SIZE + 16`, but `decryptBytes()` does not. Passing short data will throw an obscure WebCrypto error instead of a clear message.

### M5. Emoji usage for icons
**Files:** `lock-screen.tsx:32`, `login-form.tsx:69`, `register-form.tsx:81`
- Using emoji for lock icon and eye toggle. Design spec says Lucide icons (strokeWidth 1.5). Emojis render differently across platforms.
- **Fix:** Replace with Lucide `Lock`, `Eye`, `EyeOff` icons.

---

## Low Priority

### L1. `host_permissions: ['<all_urls>']` too broad
**File:** `wxt.config.ts:12`
- Not needed for Phase 4 auth. Only needed for autofill content scripts in Phase 6.
- **Fix:** Remove until Phase 6, or scope to specific domains.

### L2. Inline styles instead of CSS modules/Tailwind
**Files:** All auth components
- Every component uses `React.CSSProperties` objects. Works, but doesn't scale. Consider Tailwind (already in stack) for Phase 5+.

### L3. Missing `aria-label` on eye toggle buttons
**Files:** All three auth forms
- The eye toggle button has no accessible label.

---

## Edge Cases Found

1. **Service worker restart:** Chrome can kill/restart service workers. `last_activity_at` is in session storage (survives), but any in-flight message listeners are re-registered. Current implementation handles this correctly via `defineBackground()`.
2. **Multiple popup opens:** Opening popup in rapid succession calls `hydrate()` multiple times. No race condition since Zustand `set()` is synchronous, but the activity-ping fires multiple times unnecessarily.
3. **Email case sensitivity:** `deriveMasterKey` uses email as-is for salt. "User@Email.com" and "user@email.com" produce different master keys. Should normalize to lowercase before key derivation.
4. **Token expiry:** No JWT refresh logic. Access tokens will expire, and the user gets a generic fetch error. Needs refresh token rotation before Phase 5 sync.

---

## Positive Observations

- Clean separation: session-storage.ts isolates all Chrome API calls
- Auth store is well-structured with clear action boundaries
- HKDF domain separation ("vaultic-enc" / "vaultic-auth") matches Rust exactly
- Password strength meter on registration — good UX
- Rejection sampling in password-gen eliminates modulo bias
- Design tokens used consistently across all UI components

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix extractable key issue in kdf.ts — blocks all functionality
2. **[CRITICAL]** Add password verification to unlock flow (encrypted sentinel)
3. **[CRITICAL]** Normalize email to lowercase before key derivation (both TS and Rust)
4. **[HIGH]** Set `chrome.storage.session.setAccessLevel` to TRUSTED_CONTEXTS
5. **[HIGH]** Extract API_BASE_URL to shared config, remove http fallback
6. **[HIGH]** Avoid double Argon2id derivation on register
7. **[HIGH]** Guarantee character class coverage in password generator
8. **[MEDIUM]** Add minimum length check in `decryptBytes`
9. **[MEDIUM]** Replace emojis with Lucide icons per design spec
10. **[MEDIUM]** Add rate limiting to unlock attempts

---

## Unresolved Questions

- Is there an interop test suite that runs TS crypto against Rust test vectors? The `test-vectors.json` in vaultic-crypto suggests yes, but no TS-side tests found.
- Will `chrome.storage.session` quota (1MB default) be sufficient for storing key material + future cached vault metadata?
- Should the extension support Firefox via `browser.*` APIs? WXT abstracts this, but `chrome.storage.session` usage is Chrome-specific (Firefox has limited support).
