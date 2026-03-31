# Phase 0: Refactor Shared Packages

## Priority: Critical (blocks all other phases)
## Status: ✅ COMPLETED
## Effort: 0.5 day

## Overview

Move 4 reusable lib files from extension to shared packages. Add `exports` field to package.json files. This ensures web app imports from packages, not duplicated code.

## Key Insights

- `fetch-with-auth.ts` imports from `session-storage.ts` (chrome-specific) → must decouple via dependency injection
- `vault-crypto.ts`, `encoding-utils.ts`, `sync-api-transforms.ts` have zero chrome dependencies → direct move
- `@vaultic/ui` has `@types/chrome` in devDependencies → remove after this phase

## Files to Modify

### Move to @vaultic/crypto
- `client/apps/extension/src/lib/vault-crypto.ts` → `client/packages/crypto/src/vault-helpers.ts`
- `client/apps/extension/src/lib/encoding-utils.ts` → `client/packages/crypto/src/encoding-utils.ts`
- Update `client/packages/crypto/src/index.ts` — add new exports

### Move to @vaultic/api
- `client/apps/extension/src/lib/sync-api-transforms.ts` → `client/packages/api/src/sync-transforms.ts`
- Update `client/packages/api/src/index.ts` — add new exports

### Refactor fetch-with-auth (dependency injection)
- `client/apps/extension/src/lib/fetch-with-auth.ts` → `client/packages/api/src/fetch-with-auth.ts`
- Change signature: accept `getTokens`/`storeTokens` as params instead of importing chrome storage
- Extension creates wrapper that passes chrome.storage functions
- Web app creates wrapper that passes sessionStorage/cookie functions

### Update extension imports
- All files in `client/apps/extension/src/` that import from `../lib/vault-crypto`, `../lib/encoding-utils`, `../lib/sync-api-transforms` → change to `@vaultic/crypto`, `@vaultic/api`

### Add exports field to package.json
- `client/packages/crypto/package.json`
- `client/packages/api/package.json`
- `client/packages/storage/package.json`
- `client/packages/sync/package.json`
- `client/packages/ui/package.json`
- `client/packages/types/package.json`

## Implementation Steps

### 1. Move vault-crypto.ts → @vaultic/crypto

```typescript
// client/packages/crypto/src/vault-helpers.ts
import { encrypt, decrypt } from './cipher';
import type { LoginCredential } from '@vaultic/types';

export async function encryptVaultItem(key: CryptoKey, item: LoginCredential): Promise<string> {
  return encrypt(key, JSON.stringify(item));
}

export async function decryptVaultItem(key: CryptoKey, encryptedData: string): Promise<LoginCredential> {
  return JSON.parse(await decrypt(key, encryptedData));
}

export async function encryptFolderName(key: CryptoKey, name: string): Promise<string> {
  return encrypt(key, name);
}

export async function decryptFolderName(key: CryptoKey, encryptedName: string): Promise<string> {
  return decrypt(key, encryptedName);
}
```

### 2. Move encoding-utils.ts → @vaultic/crypto

```typescript
// client/packages/crypto/src/encoding-utils.ts
// Same content — zero changes needed, pure browser APIs (btoa, atob, crypto.subtle)
```

### 3. Move sync-api-transforms.ts → @vaultic/api

```typescript
// client/packages/api/src/sync-transforms.ts
// Same content — only depends on @vaultic/types (already a dependency)
```

### 4. Refactor fetch-with-auth.ts → @vaultic/api (dependency injection)

```typescript
// client/packages/api/src/fetch-with-auth.ts
export interface TokenProvider {
  getTokens(): Promise<{ accessToken: string; refreshToken: string } | null>;
  storeTokens(accessToken: string, refreshToken: string): Promise<void>;
}

export function createFetchWithAuth(apiBaseUrl: string, tokenProvider: TokenProvider) {
  return async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
    const tokens = await tokenProvider.getTokens();
    if (!tokens?.accessToken) throw new Error('Not authenticated');

    const doFetch = (accessToken: string) =>
      fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

    let res = await doFetch(tokens.accessToken);

    if (res.status === 401 && tokens.refreshToken) {
      const refreshRes = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        await tokenProvider.storeTokens(data.access_token, tokens.refreshToken);
        res = await doFetch(data.access_token);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    return res;
  };
}
```

### 5. Update extension to use new imports

```typescript
// Before (extension files):
import { encryptVaultItem } from '../lib/vault-crypto';
import { uint8ToBase64, base64ToUint8, computeVerifier } from '../lib/encoding-utils';
import { toApiItem, fromApiItem } from '../lib/sync-api-transforms';
import { fetchWithAuth } from '../lib/fetch-with-auth';

// After:
import { encryptVaultItem } from '@vaultic/crypto';
import { uint8ToBase64, base64ToUint8, computeVerifier } from '@vaultic/crypto';
import { toApiItem, fromApiItem } from '@vaultic/api';
import { createFetchWithAuth } from '@vaultic/api';
```

Extension creates its fetch instance:

```typescript
// client/apps/extension/src/lib/create-auth-fetch.ts
import { createFetchWithAuth } from '@vaultic/api';
import { getTokens, storeTokens } from './session-storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const fetchWithAuth = createFetchWithAuth(API_BASE_URL, {
  getTokens,
  storeTokens,
});
```

### 6. Add exports field to all package.json files

```jsonc
// Example for @vaultic/crypto/package.json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  }
}
```

### 7. Remove @types/chrome from @vaultic/ui

`@vaultic/ui/package.json` → remove `@types/chrome` from devDependencies.

### 8. Verify — build all packages

```bash
pnpm build
pnpm --filter @vaultic/extension dev  # check extension still works
```

## Todo

- [x] Move vault-crypto.ts → @vaultic/crypto/src/vault-helpers.ts
- [x] Move encoding-utils.ts → @vaultic/crypto/src/encoding-utils.ts
- [x] Update @vaultic/crypto/src/index.ts exports
- [x] Move sync-api-transforms.ts → @vaultic/api/src/sync-transforms.ts
- [x] Update @vaultic/api/src/index.ts exports
- [x] Refactor fetch-with-auth.ts → @vaultic/api with TokenProvider interface
- [x] Create extension/src/lib/create-auth-fetch.ts wrapper
- [x] Update all extension imports to use @vaultic/crypto, @vaultic/api
- [x] Delete old extension/src/lib files (vault-crypto, encoding-utils, sync-api-transforms, fetch-with-auth)
- [x] Add exports field to all 6 package.json files
- [x] Remove @types/chrome from @vaultic/ui devDependencies
- [x] Run `pnpm build` — verify no errors
- [x] Run `tsc --noEmit` on extension — verify no type errors

## Success Criteria

- All shared code lives in packages, not extension
- Extension imports from @vaultic/* only (no relative ../lib/ for moved files)
- `pnpm build` passes with zero errors
- Extension dev works normally

## Risk Assessment

- **Import breakage**: Many files reference old paths → grep all imports before deleting
- **Circular dependency**: fetch-with-auth depends on TokenProvider interface → keep interface in @vaultic/api
- **Build order**: packages must build before extension → turborepo handles this already
