# Phase 5: Test + Polish

## Priority: High
## Status: ⏳ IN PROGRESS (code review + final QA)
## Effort: 2 days

## Overview

E2E testing, security audit, responsive QA, production build verification. Ensure web app matches extension quality.

## Testing Strategy

### 1. Unit Tests (~0.5 day)

#### web-storage.ts
- storeEncryptionKeyBytes → getEncryptionKey roundtrip
- storeAccessToken → getAccessToken
- storeUserInfo → getUserInfo
- clearEncryptionKey clears sessionStorage
- getEncryptionKey returns non-extractable CryptoKey

#### web-auto-lock.ts
- Timer fires after timeout
- Timer resets on activity events
- stopAutoLock clears timer

#### web-sync-scheduler.ts
- Interval calls doSync periodically
- stopSyncScheduler clears interval

#### web-clipboard.ts
- copyAndAutoClear writes to clipboard
- Clears after timeout

### 2. Integration Tests (~0.5 day)

#### Auth flow
- Register → login → get httpOnly cookie → access token in sessionStorage
- Token refresh via httpOnly cookie → new access token
- Logout → cookie cleared + sessionStorage cleared
- Expired access token → auto-refresh → retry succeeds

#### Vault CRUD
- Create vault item → encrypted in IndexedDB
- Read vault item → decrypted correctly
- Update vault item → new ciphertext
- Delete vault item → soft delete with deleted_at

#### Sync flow
- Enable sync → push local items to server
- Pull changes from server → merge into local
- Conflict resolution (LWW) works

### 3. Security Audit (~0.5 day)

| Check | Method | Expected |
|-------|--------|----------|
| httpOnly cookie not accessible | `document.cookie` in console | No refresh_token visible |
| XSS cannot steal refresh token | Inject script, try read cookie | Fails |
| Access token in sessionStorage only | Check localStorage | Not in localStorage |
| Encryption key non-extractable | `crypto.subtle.exportKey()` | Throws DOMException |
| CORS blocks unauthorized origins | Fetch from different origin | Blocked |
| SameSite prevents CSRF | Cross-origin form POST | Cookie not sent |
| No plaintext in IndexedDB | Inspect IndexedDB in DevTools | Only ciphertext blobs |
| CSP headers set | Check response headers | script-src 'self' |

### 4. Responsive QA (~0.5 day)

| Viewport | Width | Test |
|----------|-------|------|
| Mobile S | 320px | All pages render, no overflow |
| Mobile M | 375px | Standard mobile experience |
| Mobile L | 425px | Comfortable mobile |
| Tablet | 768px | Centered container, good spacing |
| Desktop | 1024px+ | 480px centered, generous margins |

Key checks:
- Vault list items readable on 320px
- Password generator modal fits mobile
- Settings toggles accessible
- Share link copyable on mobile
- Login/register forms usable with virtual keyboard

## Files to Create

### `client/apps/web/src/__tests__/web-storage.test.ts`
### `client/apps/web/src/__tests__/web-auto-lock.test.ts`
### `client/apps/web/src/__tests__/web-clipboard.test.ts`

### `client/apps/web/.env.production`

```
VITE_API_URL=https://api.vaultic.io
```

## Files to Modify

### `client/apps/web/vite.config.ts` — production build config

```typescript
build: {
  outDir: 'dist',
  sourcemap: false,
  rollupOptions: {
    output: {
      manualChunks: {
        crypto: ['@vaultic/crypto'],
        vendor: ['react', 'react-dom', 'react-router', 'zustand'],
      },
    },
  },
}
```

### `client/apps/web/index.html` — CSP meta tag

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://api.vaultic.io;">
```

### Backend CORS — add web domain

```bash
# .env.production
CORS_ORIGIN=https://app.vaultic.io,chrome-extension://xxx
```

## Implementation Steps

1. Write unit tests for web-storage, auto-lock, clipboard
2. Write integration test for auth flow (register → login → refresh → logout)
3. Write integration test for vault CRUD + sync
4. Run security audit checklist
5. Test all viewports (320px → 1024px+)
6. Add production build config
7. Add CSP headers
8. Test production build: `pnpm --filter @vaultic/web build && pnpm --filter @vaultic/web preview`
9. Fix any issues found
10. Final `tsc --noEmit` + `pnpm build` from root

## Todo

- [ ] Unit tests: web-storage.ts
- [ ] Unit tests: web-auto-lock.ts
- [ ] Unit tests: web-clipboard.ts
- [ ] Integration test: auth flow (register/login/refresh/logout)
- [ ] Integration test: vault CRUD (create/read/update/delete)
- [ ] Integration test: sync flow (push/pull/conflict)
- [ ] Security audit: httpOnly cookie, XSS, CSRF, encryption key
- [ ] Responsive QA: 320px, 375px, 425px, 768px, 1024px+
- [ ] Production build config (vite.config.ts)
- [ ] CSP meta tag in index.html
- [ ] Backend CORS update for web domain
- [ ] Production build + preview test
- [ ] Fix all issues found
- [ ] Final tsc --noEmit + pnpm build

## Success Criteria

- All unit tests pass
- Auth flow works end-to-end with httpOnly cookies
- Vault CRUD + sync verified
- Security audit passes all checks
- Responsive on all viewports (320px–1024px+)
- Production build under 500KB (gzipped)
- No TypeScript errors
- No console errors in production build
