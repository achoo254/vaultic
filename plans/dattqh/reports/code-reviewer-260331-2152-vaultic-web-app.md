# Code Review: Vaultic Web App

**Date:** 2026-03-31 | **Scope:** `client/apps/web/`, shared packages refactor, backend auth endpoints
**Files:** ~30 new/modified | **Focus:** Security, architecture, correctness

## Overall Assessment

Solid first iteration. Good reuse of shared packages via `TokenProvider` abstraction and `StorageAdapter` pattern. The httpOnly cookie approach for refresh tokens in the web app is the correct architecture decision. However, there are several security issues (2 critical, 3 high) that must be addressed before production.

---

## Critical Issues

### C1. Encryption key raw bytes stored as JSON array in sessionStorage (XSS = full vault compromise)

**File:** `client/apps/web/src/lib/web-storage.ts:9-12`

sessionStorage is accessible to **any JavaScript running on the page**. If an XSS vulnerability exists anywhere (third-party script, DOM injection, etc.), an attacker can trivially read the encryption key:

```js
JSON.parse(sessionStorage.getItem('enc_key')) // raw key bytes
```

Unlike the extension which uses `chrome.storage.session` (isolated from page JS), the web app has no such isolation boundary. This is the **most sensitive secret in the entire system** — it decrypts all vault items.

**Impact:** Complete vault compromise via any XSS vector.

**Recommendation:** This is an inherent limitation of a web app vs. extension. At minimum:
1. Document this threat prominently for users (web app has weaker security model than extension)
2. Add a strict CSP header (no inline scripts, no eval, limited script-src) to minimize XSS surface
3. Consider using a Web Worker for crypto operations to isolate the key from the main thread
4. Consider `IndexedDB` with an opaque wrapper rather than plain sessionStorage — at least requires more targeted attack

### C2. `/web/refresh` token rotation creates a new refresh token from the OLD token's payload without incrementing `tokenVersion`

**File:** `backend/src/routes/auth-route.ts:95-108`

```ts
const payload = verifyToken(refreshToken, envConfig.jwtSecret);
const newRefresh = createRefreshToken(
  payload.sub, envConfig.jwtSecret, envConfig.refreshTokenTtlDays, payload.tokenVersion,
);
```

The rotation creates a new refresh token with the **same `tokenVersion`** as the old one. This means:
- The old refresh token remains valid (not revoked)
- Token theft = permanent session hijack (attacker and user both have valid tokens)
- The standard `/refresh` endpoint (body-based) also produces a result — the new cookie token and the body response `result` may carry **different** refresh tokens

**Impact:** Refresh token reuse / replay attack. Cookie-stolen refresh token cannot be revoked.

**Recommendation:**
1. Increment `tokenVersion` on rotation, or use a server-side token revocation list
2. The `authService.refresh()` already returns a new access token — you should use ITS refresh token (if it rotates), not manually create a second one
3. Alternatively, don't rotate the cookie refresh token on each refresh call; just let it expire naturally (simpler, fewer bugs)

---

## High Priority

### H1. TokenProvider interface contract violation — `storeTokens` arity mismatch

**File:** `client/apps/web/src/lib/web-auth-fetch.ts:15`

```ts
// Interface requires:  storeTokens(accessToken: string, refreshToken: string): Promise<void>
// Web implements:      async storeTokens(accessToken: string) { ... }
```

The `webTokenProvider.storeTokens` accepts only 1 parameter, but the interface declares 2. TypeScript may not catch this because extra parameters are silently ignored in JS. However, `createFetchWithAuth` calls `tokenProvider.storeTokens(newAccessToken, tokens.refreshToken)` — the second argument (`'__cookie__'`) is silently dropped, which is the intended behavior but fragile.

**Impact:** If any future refactor relies on the second argument being stored, it will silently fail.

**Recommendation:** Make the interface explicit — add `refreshToken?: string` as optional, or create a `WebTokenProvider` subtype.

### H2. No route guards — vault page accessible without auth

**File:** `client/apps/web/src/router.tsx`

All routes are publicly accessible. The vault page has a `useEffect` redirect, but:
1. The vault page renders briefly before the redirect fires (flash of content)
2. `hydrate()` in `app.tsx` is async — `vaultState` might still be `'no_vault'` when the vault page renders, causing a redirect even for returning users
3. No route guard for `/settings` or `/share` pages either

**Impact:** Race condition between hydrate completing and route rendering. Users may flash-see vault UI or be incorrectly redirected.

**Recommendation:** Add an `AuthGuard` wrapper component that shows a loading spinner until hydrate completes, then redirects or renders children.

### H3. `fetchWithAuth` does not send `credentials: 'include'` — cookies won't be sent with authenticated API calls

**File:** `client/packages/api/src/fetch-with-auth.ts:29-37`

The generic `doFetch` function does **not** set `credentials: 'include'`. This means when the web app calls authenticated endpoints (sync push/pull), the httpOnly cookie won't be sent. The custom `refreshFn` correctly uses `credentials: 'include'`, but normal API calls don't.

This works now because the access token goes in the `Authorization` header, but if the access token expires and the 401 refresh flow triggers, the `doFetch` retry still won't send cookies. The `refreshFn` refreshes correctly, but any server-side middleware checking cookies for rate limiting or session tracking won't see them.

**Impact:** Not immediately broken (auth header works), but inconsistent cookie behavior may cause issues with future server-side session features.

**Recommendation:** Either:
- Pass `credentials: 'include'` in the web app's `fetchOptions` from call sites
- Or add a `fetchDefaults` option to `createFetchWithAuth` that merges into every request

### H4. `VITE_API_URL` defaults to empty string — production will break without explicit config

**Files:** `client/apps/web/src/lib/web-auth-fetch.ts:5`, `client/apps/web/src/stores/auth-store.ts:46`, `client/apps/web/src/stores/auth-server-actions.ts:19`

Three separate files each read `import.meta.env.VITE_API_URL || ''`. Empty string means requests go to same-origin, which works in dev (Vite proxy) but in production the web app and API may be on different origins.

**Impact:** Production deployment will silently hit 404s or wrong endpoints unless correctly configured.

**Recommendation:**
1. Centralize `API_BASE_URL` into a single config module (DRY violation — defined 3 times)
2. Add a startup check that warns if `VITE_API_URL` is empty in production builds

---

## Medium Priority

### M1. Hardcoded colors in `global.css`

**File:** `client/apps/web/src/global.css:33,42,43,48`

```css
scrollbar-thumb: #D0DAE6;     /* should use design token */
::selection background: #024799; /* should use design token */
:focus-visible outline: #024799; /* should use design token */
```

**Recommendation:** Use CSS custom properties mapped to design tokens, or move to a CSS-in-JS approach consistent with the rest of the app.

### M2. `vault-store.ts` exceeds 200-line limit (248 lines)

**File:** `client/apps/web/src/stores/vault-store.ts`

Per project rules, files should be under 200 lines. Extract `useFilteredItems` and/or CRUD operations into separate modules.

### M3. `vault-page.tsx` at 263 lines — well over 200-line limit

**File:** `client/apps/web/src/pages/vault-page.tsx`

Contains 4 components in one file. Extract `VaultItemCard`, `VaultItemFormModal`, and `PasswordGeneratorModal` into `components/` directory.

### M4. SyncEngine cache doesn't invalidate on logout

**File:** `client/apps/web/src/lib/create-sync-engine.ts:8`

`cachedEngine` persists across login/logout cycles. If user A logs out and user B logs in within the same tab session, `cachedEngine` still holds user A's engine (userId check helps, but the underlying `IndexedDBStore` and `IndexedDBSyncQueue` instances are shared).

**Recommendation:** Clear `cachedEngine` on logout (export a `clearSyncEngine()` function, call from auth-store logout).

### M5. No delete confirmation dialog

**File:** `client/apps/web/src/pages/vault-page.tsx:77`

`onDelete={() => deleteItem(item.id)}` — single click permanently deletes. Should show a confirmation modal.

### M6. Share page is a placeholder

**File:** `client/apps/web/src/pages/share-page.tsx:21`

`setShareUrl('Share feature will be fully wired in next iteration')` — if this ships to production, users will see a non-functional feature. Either remove the route or add a "coming soon" banner.

### M7. DRY: `getChromeStorage()` + `defaultAdapter` duplicated between theme-provider and i18n-provider

**Files:** `client/packages/ui/src/styles/theme-provider.tsx:40-66`, `client/packages/ui/src/styles/i18n-provider.tsx:22-48`

Identical code blocks. Extract into a shared `default-storage-adapter.ts` module.

---

## Low Priority

### L1. `PasswordGeneratorModal` doesn't use `copyAndAutoClear` — direct `clipboard.writeText` instead

**File:** `client/apps/web/src/pages/vault-page.tsx:234`

Uses raw clipboard API instead of the secure `copyAndAutoClear` from `web-clipboard.ts`. Generated passwords should also auto-clear.

### L2. Missing `<meta>` CSP header in `index.html`

No Content-Security-Policy meta tag. Should be added for defense-in-depth against XSS (especially critical given C1).

### L3. `cookie-parser` added but no CSRF protection for cookie-authenticated endpoints

**File:** `backend/src/server.ts:37`

The web endpoints use `sameSite: 'strict'` which mitigates most CSRF, but if CORS ever relaxes, there's no CSRF token as a second layer.

---

## Positive Observations

- Clean `TokenProvider` abstraction enables genuine code reuse between extension and web
- httpOnly cookie for refresh token is the correct pattern for web apps
- `StorageAdapter` refactor in theme/i18n providers is well-designed
- Auto-lock with visibility change awareness is thoughtful
- Clipboard auto-clear is a good security practice
- Good use of design tokens throughout UI components
- Zod validation on all backend auth endpoints

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Address C1: Add strict CSP, consider Web Worker crypto isolation, document web security model limitations
2. **[CRITICAL]** Fix C2: Fix refresh token rotation — either don't rotate (simpler) or properly increment tokenVersion and revoke old token
3. **[HIGH]** Fix H2: Add `AuthGuard` component with loading state
4. **[HIGH]** Fix H4: Centralize `API_BASE_URL` into single config module
5. **[HIGH]** Fix H1: Align `TokenProvider.storeTokens` signature
6. **[MEDIUM]** Fix M4: Clear sync engine cache on logout
7. **[MEDIUM]** Fix M1/M2/M3: Hardcoded colors + file size compliance
8. **[LOW]** Fix L1/L2/L3: Clipboard, CSP meta, CSRF consideration

---

## Unresolved Questions

1. Is there a deployment plan for how the web app will be served in production? (Same origin as API? Different subdomain?) This affects CORS, cookie paths, and the `VITE_API_URL` config.
2. Should the web app clearly communicate to users that it has a weaker security model than the extension (sessionStorage vs chrome.storage.session)?
3. Will the `secure` cookie flag work correctly? It's tied to `corsOrigin !== false`, which is a proxy for "production" — but the actual requirement is HTTPS, not CORS config.
