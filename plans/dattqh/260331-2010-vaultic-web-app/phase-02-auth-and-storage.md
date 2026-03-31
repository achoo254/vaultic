# Phase 2: Backend httpOnly Auth + Web Storage Adapter

## Priority: High
## Status: ✅ COMPLETED
## Effort: 1.5 days

## Overview

Add httpOnly cookie auth endpoints to backend. Create web-storage.ts adapter (sessionStorage/localStorage replacement for chrome.storage). Wire auth flow in web app.

## Context Links

- Backend auth: `backend/src/routes/auth-route.ts`, `backend/src/services/auth-service.ts`
- Extension session storage: `client/apps/extension/src/lib/session-storage.ts` (127 LOC — chrome-specific)
- JWT utils: `backend/src/utils/jwt-utils.ts`
- Env config: `backend/src/config/env-config.ts`

## Architecture

```
Auth Flow — Web App (httpOnly cookies)
┌──────────┐     POST /login      ┌──────────┐
│  Web App  │ ──────────────────→ │  Backend  │
│           │ ← access_token body │           │
│           │ ← Set-Cookie:       │           │
│           │   refresh=xxx;      │           │
│           │   httpOnly; Secure;  │           │
│           │   SameSite=Strict   │           │
└──────────┘                      └──────────┘

401 → POST /refresh (cookie auto-sent)
    ← new access_token body
    ← new Set-Cookie refresh
```

**Key difference from extension:**
- Extension: both tokens in chrome.storage.local (managed by JS)
- Web: access token in sessionStorage (JS), refresh token in httpOnly cookie (invisible to JS)

## Backend Changes

### Files to Modify

#### 1. `backend/src/services/auth-service.ts`

Add `loginWeb()` variant that returns tokens separately:

```typescript
export async function loginWeb(email: string, authHash: string) {
  // Same validation as login()
  const result = await login(email, authHash);
  // Split: access_token for body, refresh_token for cookie
  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token, // will be set as httpOnly cookie
    user_id: result.user_id,
  };
}

export async function refreshWeb(refreshTokenStr: string) {
  // Same as refresh() but also returns new refresh token for cookie rotation
  const payload = verifyToken(refreshTokenStr, envConfig.jwtSecret);
  if (payload.tokenType !== 'refresh') throw AppError.unauthorized('expected refresh token');

  const user = await User.findById(payload.sub).select('tokenVersion');
  if (!user || payload.tokenVersion !== user.tokenVersion) throw AppError.unauthorized('token revoked');

  const accessToken = createAccessToken(payload.sub, envConfig.jwtSecret, envConfig.accessTokenTtlMin, user.tokenVersion);
  const newRefreshToken = createRefreshToken(payload.sub, envConfig.jwtSecret, envConfig.refreshTokenTtlDays, user.tokenVersion);
  return { access_token: accessToken, refresh_token: newRefreshToken };
}
```

Actually, existing `login()` and `refresh()` already return the needed tokens. The difference is only in the **route layer** (how tokens are sent). No service changes needed.

#### 2. `backend/src/routes/auth-route.ts` — add web-specific endpoints

```typescript
// Cookie config
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: envConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
};

// POST /api/v1/auth/web/login — same validation, cookie response
authRouter.post('/web/login', rateLimit(FIFTEEN_MIN, 10), async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body.email, body.auth_hash);
  res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
  res.json({ access_token: result.access_token, user_id: result.user_id });
});

// POST /api/v1/auth/web/refresh — read cookie, return new access token
authRouter.post('/web/refresh', rateLimit(FIFTEEN_MIN, 30), async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) throw AppError.unauthorized('no refresh token');
  const result = await authService.refresh(refreshToken);
  // Rotate refresh token cookie
  const newRefresh = createRefreshToken(/* from verified payload */);
  res.cookie('refresh_token', newRefresh, COOKIE_OPTIONS);
  res.json(result);
});

// POST /api/v1/auth/web/logout — clear cookie
authRouter.post('/web/logout', async (req, res) => {
  res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  res.json({ message: 'logged out' });
});
```

#### 3. `backend/src/server.ts` — add cookie-parser

```typescript
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

#### 4. `backend/src/config/env-config.ts` — add CORS for web app

Already supports `CORS_ORIGIN` as comma-separated list. Just document in .env.example.

#### 5. `backend/package.json` — add cookie-parser dependency

```bash
pnpm --filter @vaultic/backend add cookie-parser
pnpm --filter @vaultic/backend add -D @types/cookie-parser
```

## Frontend Changes (Web App)

### Files to Create

#### 1. `client/apps/web/src/lib/web-storage.ts`

Web equivalent of extension's session-storage.ts. Same interface, different backends.

```typescript
// Web storage adapter — sessionStorage for session data, localStorage for persistent data
// Equivalent of extension's session-storage.ts but using web APIs

/** Store encryption key bytes in sessionStorage (cleared when tab closes). */
export async function storeEncryptionKeyBytes(rawBytes: ArrayBuffer): Promise<void> {
  const arr = Array.from(new Uint8Array(rawBytes));
  sessionStorage.setItem('enc_key', JSON.stringify(arr));
}

/** Retrieve encryption key from sessionStorage.
 *  Returns non-extractable CryptoKey (ADV-07 security). */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const stored = sessionStorage.getItem('enc_key');
  if (!stored) return null;
  const arr = new Uint8Array(JSON.parse(stored));
  return crypto.subtle.importKey('raw', arr, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Clear encryption key (lock vault). */
export async function clearEncryptionKey(): Promise<void> {
  sessionStorage.removeItem('enc_key');
}

/** Store access token in sessionStorage. Refresh token is in httpOnly cookie. */
export async function storeAccessToken(accessToken: string): Promise<void> {
  sessionStorage.setItem('access_token', accessToken);
}

/** Get access token. */
export async function getAccessToken(): Promise<string | null> {
  return sessionStorage.getItem('access_token');
}

/** Clear access token. */
export async function clearAccessToken(): Promise<void> {
  sessionStorage.removeItem('access_token');
}

/** Store user info in localStorage (persists). */
export async function storeUserInfo(email: string, userId: string): Promise<void> {
  localStorage.setItem('user_email', email);
  localStorage.setItem('user_id', userId);
}

/** Get user info. */
export async function getUserInfo(): Promise<{ email: string; userId: string } | null> {
  const email = localStorage.getItem('user_email');
  const userId = localStorage.getItem('user_id');
  if (!email) return null;
  return { email, userId: userId ?? '' };
}

/** Clear user info. */
export async function clearUserInfo(): Promise<void> {
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_id');
}

/** Store VaultConfig in localStorage. */
export async function storeVaultConfig(config: import('@vaultic/types').VaultConfig): Promise<void> {
  localStorage.setItem('vault_config', JSON.stringify(config));
}

/** Get VaultConfig. */
export async function getVaultConfig(): Promise<import('@vaultic/types').VaultConfig | null> {
  const stored = localStorage.getItem('vault_config');
  return stored ? JSON.parse(stored) : null;
}

/** Clear VaultConfig. */
export async function clearVaultConfig(): Promise<void> {
  localStorage.removeItem('vault_config');
}
```

#### 2. `client/apps/web/src/lib/web-auth-fetch.ts`

Web-specific authenticated fetch using httpOnly cookies for refresh.

```typescript
import { createFetchWithAuth, type TokenProvider } from '@vaultic/api';
import { getAccessToken, storeAccessToken } from './web-storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Web TokenProvider: access token from sessionStorage, refresh via httpOnly cookie
const webTokenProvider: TokenProvider = {
  async getTokens() {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;
    // refreshToken is in httpOnly cookie — not accessible from JS
    // Pass empty string; the cookie is auto-sent by browser
    return { accessToken, refreshToken: '__cookie__' };
  },
  async storeTokens(accessToken: string) {
    await storeAccessToken(accessToken);
  },
};

export const fetchWithAuth = createFetchWithAuth(API_BASE_URL, webTokenProvider);
```

Note: The `createFetchWithAuth` from Phase 0 needs to handle the web case where refresh uses `/web/refresh` endpoint and cookie is auto-sent (no body). This means the refresh logic should be configurable or the web app overrides it.

**Better approach:** `createFetchWithAuth` accepts optional `refreshFn`:

```typescript
// In @vaultic/api/src/fetch-with-auth.ts
export interface FetchWithAuthOptions {
  tokenProvider: TokenProvider;
  refreshFn?: (apiBaseUrl: string) => Promise<string | null>; // returns new access token
}
```

Web app passes custom refreshFn that calls `/web/refresh` with credentials: 'include'.

## Implementation Steps

1. Install cookie-parser in backend
2. Add cookie-parser middleware in server.ts
3. Add `/web/login`, `/web/refresh`, `/web/logout` routes
4. Test backend endpoints with curl
5. Create web-storage.ts in web app
6. Create web-auth-fetch.ts in web app
7. Update `createFetchWithAuth` to support custom refresh function
8. Wire auth store (adapted from extension) — Phase 3 handles full store

## Todo

- [x] `pnpm --filter @vaultic/backend add cookie-parser @types/cookie-parser`
- [x] Add `cookieParser()` to server.ts
- [x] Add COOKIE_OPTIONS config
- [x] Add `POST /web/login` route
- [x] Add `POST /web/refresh` route
- [x] Add `POST /web/logout` route
- [x] Update .env.example with CORS_ORIGIN note
- [x] Create web-storage.ts
- [x] Create web-auth-fetch.ts
- [x] Update createFetchWithAuth to accept refreshFn option
- [x] Test login → get cookie → refresh → access token cycle
- [x] Run `tsc --noEmit` on backend
- [x] Run `tsc --noEmit` on web app

## Success Criteria

- `POST /web/login` returns access_token in body + refresh_token as httpOnly cookie
- `POST /web/refresh` reads cookie, returns new access_token
- `POST /web/logout` clears cookie
- web-storage.ts passes unit tests (sessionStorage/localStorage)
- fetchWithAuth works with httpOnly cookie flow
- Existing extension auth endpoints unchanged (backward compatible)

## Security Considerations

- httpOnly cookie: JavaScript cannot access refresh_token → XSS-proof
- SameSite=Strict: prevents CSRF
- Secure flag: only sent over HTTPS in production
- Cookie path `/api/v1/auth`: only sent to auth endpoints
- Token rotation on refresh: old refresh token invalidated
- Access token in sessionStorage: cleared when tab closes (not persistent)

## Risk Assessment

- **CORS + cookies**: `credentials: 'include'` required in fetch, CORS must allow credentials
- **Cookie path scope**: `/api/v1/auth` means cookie only sent to auth routes — other API calls use Bearer token
- **SameSite=Strict**: blocks cookie on cross-origin navigation — OK for SPA (all requests from same origin)
