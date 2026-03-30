# Code Review: Vaultic Browser Extension Full Security & Quality Audit

**Reviewer**: code-reviewer | **Date**: 2026-03-30
**Scope**: ALL files in `client/apps/extension/src/` (53 files, ~5855 LOC)
**Focus**: Security, state management, content script safety, code quality

---

## Overall Assessment

The extension is well-structured for its maturity. Good use of Shadow DOM for content script isolation, proper HTML escaping, and a sound offline-first architecture. However, there are several **critical security issues** around credential handling, race conditions, and data leakage that must be addressed before any production release.

---

## CRITICAL Issues (Blocking)

### C1. auth_hash stored in chrome.storage.local leaks authentication secret
**File**: `stores/auth-store.ts:120,165` + `lib/session-storage.ts:87-100`
**Impact**: The `auth_hash` (Argon2id output sent to server for auth) is stored in `chrome.storage.local` via `storeAuthHashVerifier()`. This is the actual credential used for server authentication. Any extension with `storage` permission or a compromised browser can extract it and impersonate the user.

The `auth_hash` is NOT the same as the `authHashVerifier` (SHA256 of encryption key). They are confused/conflated:
- Line 120: `storeAuthHashVerifier(auth_hash)` -- stores the **server auth hash**, not a verifier
- Line 125-128: separately computes SHA256 verifier and stores in VaultConfig

This means `chrome.storage.local` contains the raw authentication credential that could be replayed against the server.

**Fix**: Stop storing `auth_hash` in local storage entirely. The VaultConfig already stores a SHA256 verifier of the encryption key for offline unlock verification. The auth_hash is only needed during login/register and should be discarded immediately after use.

```ts
// REMOVE these calls:
// await storeAuthHashVerifier(auth_hash); // in register, login
// The legacy hydrate migration also references this -- clean up
```

### C2. upgradeToOnline re-encrypts data BEFORE registering -- data loss on failure
**File**: `stores/auth-store.ts:282-367`
**Impact**: The upgrade flow:
1. Re-encrypts ALL items with new key (lines 292-301)
2. THEN registers with server (lines 305-318)
3. If registration fails (e.g., email taken), all vault data is now encrypted with a key derived from the new salt, but the old config still references the old salt. **The vault is now irrecoverably corrupted.**

**Fix**: Re-encrypt AFTER successful registration+login, not before. Or work on copies and only commit on success.

```ts
// Correct order:
// 1. Register + login (get tokens)
// 2. Only then re-encrypt items
// 3. Update VaultConfig last
```

### C3. Decrypted passwords exposed in background message passing
**File**: `entrypoints/background/credential-handler.ts:24-43`
**Impact**: `getMatchingCredentials()` returns plaintext `password` field in the message response back to the content script. Chrome extension message passing between content script and background is NOT encrypted -- any other extension listening on the same channel or any XSS on the page can intercept these messages.

The content script receives `{ matches: [{ password: "s3cret" }] }` and stores it in the DOM (inside Shadow DOM, but still in-memory).

**Fix**: Consider a fill-by-ID approach: content script requests fill by credential ID, background fills directly via `chrome.tabs.executeScript` or `chrome.scripting.executeScript`, so plaintext never crosses the message boundary to content script context.

### C4. Export "encrypted" format is actually plaintext JSON
**File**: `components/settings/export-vault.tsx:33-34`
**Impact**: The "Encrypted (.json)" export option writes `items.map(i => i.credential)` -- these are **already-decrypted** credentials from the Zustand store. The exported file contains plaintext names, URLs, usernames, and passwords despite the UI claiming it is "encrypted".

**Fix**: Either:
1. Actually encrypt the export with the master key (or a user-provided passphrase)
2. Rename the option to "JSON (Unencrypted)" to avoid false sense of security

### C5. Content script runs on `<all_urls>` with no origin filtering
**File**: `entrypoints/content.ts:9`
**Impact**: `matches: ['<all_urls>']` means the content script runs on every single page including `chrome://`, `file://`, internal extension pages, banking sites, etc. The script injects DOM elements and captures form submissions on ALL pages. This is:
1. A security concern (injecting into sensitive browser pages)
2. A performance concern (MutationObserver on every page)
3. Likely to break some sites

**Fix**: Restrict to HTTP/HTTPS at minimum:
```ts
matches: ['http://*/*', 'https://*/*'],
```

---

## HIGH Priority Issues

### H1. Race condition in concurrent vault operations
**File**: `stores/vault-store.ts` (multiple methods)
**Impact**: `addItem`, `updateItem`, `deleteItem`, `addFolder`, `deleteFolder` all read from `get().items`, perform async IDB operations, then `set()` based on stale state. If two operations run concurrently (e.g., rapid-fire credential saves from content script), the second `set()` will overwrite the first's state changes.

**Fix**: Use Zustand's `set(state => ...)` updater pattern or add a mutex/queue for vault mutations.

### H2. Token refresh has no retry guard -- can create infinite 401 loop
**File**: `lib/fetch-with-auth.ts:29-41`
**Impact**: If the refresh token is also expired, `refreshRes.ok` is false, but the code falls through to re-check `res.ok` on the ORIGINAL 401 response and throws. This is correct. However, there's no guard against concurrent requests all hitting 401 simultaneously and each triggering their own refresh, which can:
1. Race on `storeTokens`
2. Invalidate each other's refreshed tokens

**Fix**: Add a shared promise/mutex for the refresh flow so only one refresh runs at a time.

### H3. Credential matching uses `url.includes(domain)` -- too permissive
**File**: `entrypoints/background/credential-handler.ts:30`
**Impact**: `url.includes(extractDomain(cred.url))` means a credential for `evil.com` would match if `url` is `not-evil.com` (since "evil.com" is included in "not-evil.com"). Also, a credential for `google.com` matches `fakegoogle.com`.

**Fix**: Compare extracted domains of both URLs:
```ts
if (extractDomain(url) === extractDomain(cred.url)) { ... }
```

### H4. No rate limiting on unlock attempts
**File**: `stores/auth-store.ts:216-242`
**Impact**: The `unlock()` function has no brute-force protection. An attacker with physical access to the browser can script unlimited unlock attempts. Argon2id adds ~1s per attempt, but there's no exponential backoff or lockout.

**Fix**: Add attempt counting with exponential delay after N failures. Store attempt count in session storage.

### H5. `newVerifier` computed but NOT compared to `currentVerifier` in upgrade
**File**: `stores/auth-store.ts:273-279`
**Impact**: Lines 271-279 compute both `newVerifier` and `currentVerifier` but never compare them. The comment says "Verify against current vault's encryption key" but no verification actually happens. This means the user could enter any password during upgrade and it would proceed to re-encrypt everything with the wrong key.

**Fix**: Add the missing check:
```ts
if (newVerifier === currentVerifier) {
  // Same key, no re-encryption needed
} else {
  // Different key (expected for offline->online), proceed with re-encryption
  // But first verify the user knows the current password by checking currentVerifier against config
}
```

Actually, the real issue is: the function should verify the user's password unlocks the current vault before proceeding. Check `currentVerifier` against `config.authHashVerifier`.

### H6. Inline form escapeHtml misses single quotes in attribute context
**File**: `content/autofill-inline-add-form.ts:23-24`
**Impact**: `value="${escapeHtml(prefillUser)}"` -- the `escapeHtml` function escapes `"` but the value is injected into HTML via `innerHTML`. A username containing `' onmouseover=alert(1) '` would not be caught. While the double-quote context is handled, this is defense-in-depth issue.

Actually, looking more carefully: the `escapeHtml` does handle `"` -> `&quot;` and the attribute uses double quotes, so this specific vector is blocked. However, the pattern of using `innerHTML` with user data is inherently risky. Consider using `DOM API` (createElement + textContent) instead.

---

## MEDIUM Priority Issues

### M1. Settings page exceeds 200-line limit (375 lines)
**File**: `components/settings/settings-page.tsx`
**Impact**: Violates project's 200-line rule. Contains sync logic, theme logic, and UI all mixed together.
**Fix**: Extract sync logic into a custom hook (`useSyncSettings`), theme selector into a component.

### M2. auth-store.ts exceeds 200-line limit (443 lines)
**File**: `stores/auth-store.ts`
**Impact**: Largest file in the extension. Registration, login, offline setup, upgrade, hydration all in one store.
**Fix**: Extract `upgradeToOnline` into a separate module. Extract helper functions.

### M3. Hardcoded colors in several components
**Files**:
- `security-health.tsx:20-21` -- `#22C55E`, `#F59E0B`, `#EF4444` hardcoded
- `security-health.tsx:123` -- `#71717A` hardcoded
- `upgrade-account-modal.tsx:51,98` -- `#EFF6FF`, `#F0FDF4`, `#16A34A` hardcoded
- `setup-password-form.tsx:57-58` -- `#fef3c7`, `#92400e` hardcoded
- `export-vault.tsx:58` -- `#fef3c7`, `#92400e` hardcoded
- `share-page.tsx:150` -- `#A1A1AA` hardcoded
- Content scripts use hardcoded colors (acceptable since they inject into host pages, can't use design tokens)

**Fix**: Use design tokens from `@vaultic/ui` for all popup components.

### M4. MutationObserver has no cleanup/disconnect
**File**: `content/form-detector.ts:113-126`
**Impact**: `observeDOMChanges` returns the observer but the caller in `content.ts` never stores or disconnects it. On SPAs with heavy DOM churn, this observer runs indefinitely.

**Fix**: Store reference, disconnect when extension unloads or page navigates.

### M5. share-page.tsx exceeds 200 lines (244 lines)
**File**: `components/share/share-page.tsx`

### M6. folder-management.tsx exceeds 200 lines (224 lines)
**File**: `components/vault/folder-management.tsx`

### M7. Duplicate `escapeHtml` and `uint8ToBase64`/`base64ToUint8` utility functions
**Files**: `escapeHtml` in 3 files (autofill-icon.ts, save-banner.ts, autofill-inline-add-form.ts). `uint8ToBase64`/`base64ToUint8` duplicated in auth-store.ts and share-crypto.ts.
**Fix**: Extract to shared utility modules.

### M8. `as never` type cast in credential-handler
**File**: `entrypoints/background/credential-handler.ts:126`
**Impact**: `item_type: 'login' as never` is a type safety escape hatch.
**Fix**: Import and use the proper `ItemType` type.

### M9. Anonymous share metadata has no authentication
**File**: `components/share/share-page.tsx:94-103`
**Impact**: When in offline mode, metadata is posted without authentication. Anyone can create share metadata entries, potentially enabling abuse (spam, storage exhaustion on server).

---

## LOW Priority Issues

### L1. `listenAutoLockChanges` is empty
**File**: `entrypoints/background/auto-lock-handler.ts:46-49`
**Impact**: Dead code. Function exists but does nothing.

### L2. Clipboard clear relies on active tab having content script
**File**: `entrypoints/background/clipboard-handler.ts:16-25`
**Impact**: If no active tab or content script not injected, clipboard is not cleared. Silent failure.

### L3. Password field shows `type="text"` in vault-item-form
**File**: `components/vault/vault-item-form.tsx:122`
**Impact**: Password visible by default in add/edit form. Minor UX concern -- may be intentional for password management context.

### L4. Import only supports CSV despite claiming 1Password/Bitwarden support
**File**: `components/settings/import-passwords.tsx:26-41`
**Impact**: `handleImport` calls `parseCSV()` regardless of selected source. JSON and .1pux formats are not handled.

### L5. Security health "Old Passwords" always shows 0
**File**: `components/settings/security-health.tsx:76`
**Impact**: Hardcoded `count={0}` -- feature not implemented.

---

## Edge Cases Found by Scout

1. **Concurrent popup + content script credential save**: Content script captures credential via `CREDENTIAL_CAPTURED` -> `SAVE_CREDENTIAL`, while user simultaneously adds via popup form. Both create IndexedDB entries without coordination -- can create duplicates since the dedup check in `saveCredential` races with `addItem`.

2. **Service worker termination**: Chrome MV3 service workers can terminate at any time. In-flight `handleCapturedCredential` processing (which does multiple async IDB reads + decrypts) could be killed mid-execution. The alarms-based approach for auto-lock is correct, but message handling has no durability.

3. **IndexedDB migration runs on every vault load**: `loadVault()` checks `user_id_migrated` metadata flag, but if the flag write fails (IDB error), migration re-runs every time, potentially causing performance issues with large vaults.

4. **Vault items silently skipped on decryption failure**: Both `loadVault` and `getMatchingCredentials` swallow decryption errors with empty catch blocks. Users will never know if items are corrupted -- they just disappear from the list.

---

## Positive Observations

- Shadow DOM usage for content script UI isolation is excellent
- HTML escaping applied consistently in content scripts
- Offline-first architecture is well-designed
- VaultConfig approach for supporting both online/offline modes is clean
- Proper use of `chrome.storage.session` for encryption key (cleared on browser close)
- Auto-lock on system lock (`chrome.idle.onStateChanged`) is a good security feature
- SPA-compatible field filling with native value setter is well-implemented
- Good separation between content scripts (per-concern modules)

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 53 |
| Total LOC | ~5,855 |
| Critical issues | 5 |
| High issues | 6 |
| Medium issues | 9 |
| Low issues | 5 |
| Files over 200 lines | 4 (auth-store 443, settings-page 375, vault-store 290, share-page 244) |
| Hardcoded color violations | ~15 instances in popup components |
| Duplicate utility functions | 2 groups (escapeHtml x3, base64 helpers x2) |

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Remove `auth_hash` storage from local storage (C1)
2. **[CRITICAL]** Fix upgrade flow order: register first, then re-encrypt (C2)
3. **[CRITICAL]** Fix export claiming "encrypted" when it's plaintext JSON (C4)
4. **[CRITICAL]** Restrict content script to `http://*/*, https://*/*` (C5)
5. **[HIGH]** Fix domain matching to compare extracted domains (H3)
6. **[HIGH]** Add verification check in upgradeToOnline (H5)
7. **[HIGH]** Add mutex for token refresh (H2)
8. **[HIGH]** Consider fill-by-ID to avoid passing passwords in messages (C3)
9. **[MEDIUM]** Modularize files over 200 lines
10. **[MEDIUM]** Replace hardcoded colors with design tokens

---

**Status:** DONE
**Summary:** Comprehensive review of all 53 extension source files. Found 5 critical, 6 high, 9 medium, 5 low issues. Most critical: auth_hash leakage, destructive upgrade flow, misleading "encrypted" export, overly broad content script permissions.
**Concerns:** C1 (auth_hash storage) and C2 (upgrade data loss) are production-blocking bugs that could cause real user harm.
