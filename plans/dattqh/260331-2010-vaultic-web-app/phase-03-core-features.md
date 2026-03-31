# Phase 3: Core Features — Vault, Sync, Share

## Priority: High
## Status: ✅ COMPLETED
## Effort: 1 day

## Overview

Wire vault CRUD, sync, and share into web app. Mostly reuse from extension — adapt stores and components to use web-storage instead of chrome.storage.

## Context Links

- Extension auth store: `client/apps/extension/src/stores/auth-store.ts`
- Extension vault store: `client/apps/extension/src/stores/vault-store.ts`
- Extension components: `client/apps/extension/src/components/`
- Sync engine: `client/packages/sync/src/sync-engine.ts`
- Storage: `client/packages/storage/src/indexeddb-store.ts`

## Architecture

Web app reuses same packages as extension. Only difference: storage adapter (web-storage.ts from Phase 2 instead of chrome session-storage.ts).

```
Pages → Stores (zustand) → Packages (@vaultic/*)
  │         │                    │
  │         ├─ auth-store ──→ @vaultic/crypto (derive keys)
  │         ├─ vault-store ─→ @vaultic/storage (IndexedDB)
  │         │                → @vaultic/crypto (encrypt/decrypt)
  │         │                → @vaultic/sync (push/pull)
  │         └─ web-storage ─→ sessionStorage/localStorage
  │
  └── @vaultic/ui components
```

## Files to Create

### 1. `client/apps/web/src/stores/auth-store.ts`

Adapted from extension's auth-store.ts. Key changes:
- Import from `../lib/web-storage` instead of `../lib/session-storage`
- No `storeTokens()` for refresh (httpOnly cookie handles it)
- `storeAccessToken()` instead of `storeTokens(access, refresh)`
- Login calls `/api/v1/auth/web/login` instead of `/api/v1/auth/login`

```typescript
// Key differences from extension auth-store:
import {
  storeEncryptionKeyBytes, getEncryptionKey, clearEncryptionKey,
  storeAccessToken, clearAccessToken, getAccessToken,
  storeUserInfo, getUserInfo, clearUserInfo,
  storeVaultConfig, getVaultConfig, clearVaultConfig,
} from '../lib/web-storage';

// register() → call /api/v1/auth/register (same as extension)
//   then call /api/v1/auth/web/login to get httpOnly cookie

// login() → call /api/v1/auth/web/login
//   response body: { access_token, user_id }
//   refresh_token set as httpOnly cookie automatically
//   storeAccessToken(result.access_token)

// logout() → call /api/v1/auth/web/logout (clears cookie)
//   clearAccessToken(), clearEncryptionKey(), clearUserInfo()

// hydrate() → check getAccessToken() + getEncryptionKey()
//   if both exist → unlocked
//   if only accessToken → locked (need password to derive key)
//   if neither → no_vault or not logged in
```

### 2. `client/apps/web/src/stores/vault-store.ts`

Adapted from extension's vault-store.ts. Minimal changes:
- Import fetchWithAuth from `../lib/web-auth-fetch` instead of extension's
- Import storage functions from `../lib/web-storage`
- Same IndexedDB operations (identical — @vaultic/storage works in browsers)
- Same encrypt/decrypt (identical — @vaultic/crypto works in browsers)
- Same sync engine (identical — @vaultic/sync works in browsers)

### 3. `client/apps/web/src/stores/auth-server-actions.ts`

Adapted from extension. Change login endpoint to `/web/login`:

```typescript
// performLogin → POST /api/v1/auth/web/login (credentials: 'include' for cookie)
// performRegister → POST /api/v1/auth/register (same, then auto-login via web endpoint)
```

### 4. Page implementations (replace stubs from Phase 1)

#### `pages/login-page.tsx`
- Reuse extension's `components/auth/login-form.tsx` logic
- Responsive layout (not 380px fixed)
- Route to `/vault` on success, `/register` link

#### `pages/register-page.tsx`
- Reuse extension's `components/auth/register-form.tsx` logic
- Same fields: email, password, confirm password

#### `pages/vault-page.tsx`
- Reuse extension's vault list, search, folder components
- Responsive grid/list layout
- Add/edit/delete vault items
- Password generator modal

#### `pages/settings-page.tsx`
- Reuse extension's settings components (sync toggle, theme, language, export/import)
- Remove extension-specific settings (auto-update, content script)

#### `pages/onboarding-page.tsx`
- Reuse extension's onboarding consent screen
- Offline vault setup option

#### `pages/share-page.tsx`
- Reuse extension's share components
- Create share link, copy to clipboard

## Files to Modify

None outside web app — all packages are reused as-is.

## Implementation Steps

### 1. Create auth-store.ts (adapt from extension)
1. Copy extension's auth-store.ts
2. Replace all session-storage imports → web-storage imports
3. Replace `storeTokens(access, refresh)` → `storeAccessToken(access)`
4. Replace login endpoint → `/web/login` with `credentials: 'include'`
5. Add logout → `POST /web/logout` with `credentials: 'include'`
6. Remove `storeAuthHashVerifier` (deprecated in extension too)

### 2. Create vault-store.ts (adapt from extension)
1. Copy extension's vault-store.ts
2. Replace fetchWithAuth import → web-auth-fetch
3. Replace session-storage imports → web-storage
4. Keep all IndexedDB/sync/crypto logic identical

### 3. Create auth-server-actions.ts
1. Copy from extension
2. Change login URL to `/web/login`
3. Add `credentials: 'include'` to login/refresh fetch calls

### 4. Implement pages
1. Copy component logic from extension's popup components
2. Remove WXT-specific wrappers
3. Adapt layout for responsive web (remove 380x520 constraints)
4. Wire to stores

### 5. Wire create-sync-engine for web
- Copy extension's `create-sync-engine.ts` → `web/src/lib/create-sync-engine.ts`
- Replace fetchWithAuth import

## Todo

- [x] Create auth-store.ts (adapt from extension)
- [x] Create vault-store.ts (adapt from extension)
- [x] Create auth-server-actions.ts
- [x] Create create-sync-engine.ts (web version)
- [x] Implement login-page.tsx with auth form
- [x] Implement register-page.tsx
- [x] Implement vault-page.tsx with vault list + CRUD
- [x] Implement settings-page.tsx
- [x] Implement onboarding-page.tsx
- [x] Implement share-page.tsx
- [x] Add password generator modal
- [x] Wire sync toggle in settings
- [x] Test full flow: register → create item → encrypt → store → sync
- [x] tsc --noEmit passes

## Success Criteria

- User can register, login, create vault items
- Vault items encrypted with AES-256-GCM, stored in IndexedDB
- Sync push/pull works when Cloud Sync enabled
- Share link generation works
- Password generator works
- Export/import vault works
- All data encrypted — server never sees plaintext

## Security Considerations

- Encryption key only in sessionStorage (cleared on tab close)
- Access token only in sessionStorage
- Refresh token in httpOnly cookie (JS cannot access)
- All vault data encrypted before leaving browser
- IndexedDB stores ciphertext only
- `credentials: 'include'` only on auth endpoints (not all API calls)

## Risk Assessment

- **Store adaptation complexity**: auth-store has ~200 LOC with many chrome.storage calls → careful line-by-line replacement needed
- **Component reuse**: extension components may have inline styles for 380px → need responsive adjustments
- **i18n**: extension uses chrome.storage for language → web uses localStorage (handled by Phase 1 provider adapter)
