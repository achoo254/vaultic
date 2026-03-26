---
phase: 3
title: Testing Setup
priority: P1
effort: ~2-3h
status: pending
---

# Phase 3: Testing Setup

## Overview
Currently ZERO TypeScript tests. Setup vitest workspace + write foundational tests for critical packages.

## Related Files
- `package.json` (root — add vitest)
- `packages/crypto/` — encrypt/decrypt tests
- `packages/sync/` — delta sync, conflict resolution tests
- `packages/storage/` — vault CRUD tests
- `packages/api/` — API client tests

## Implementation Steps

### 3.1 Setup Vitest Workspace
**Root level:**
```bash
pnpm add -Dw vitest @vitest/coverage-v8
```

**Create `vitest.workspace.ts`:**
```typescript
export default ['packages/*'];
```

**Update root `package.json`:**
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Per-package `vitest.config.ts`** (create in each testable package):
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for UI
  },
});
```

### 3.2 Tests for @vaultic/crypto (Priority 1)
**File:** `packages/crypto/src/__tests__/crypto.test.ts`

Test cases:
- [ ] `encrypt()` → `decrypt()` roundtrip returns original plaintext
- [ ] `decrypt()` with wrong key throws error
- [ ] `deriveKey()` produces deterministic output for same inputs
- [ ] `deriveKey()` produces different output for different passwords
- [ ] `generatePassword()` respects length and character set options
- [ ] Encrypted output format is valid (nonce + ciphertext + tag)

**Note:** Uses WebCrypto API — vitest environment may need `@vitest/web-worker` or polyfill. Check if `crypto.subtle` is available in Node.js (it is since Node 15+).

### 3.3 Tests for @vaultic/sync (Priority 2)
**File:** `packages/sync/src/__tests__/sync-engine.test.ts`

Test cases:
- [ ] `createDelta()` generates correct delta format
- [ ] `mergePullResponse()` applies server changes to local store
- [ ] LWW conflict resolution: newer timestamp wins
- [ ] LWW conflict resolution: equal timestamps — server wins
- [ ] Deleted items are marked, not removed
- [ ] Empty pull response = no-op

### 3.4 Tests for @vaultic/storage (Priority 3)
**File:** `packages/storage/src/__tests__/vault-store.test.ts`

**Challenge:** IndexedDB not available in Node.js. Options:
- **Option A (Recommended):** Use `fake-indexeddb` package as polyfill
- **Option B:** Abstract storage interface, test with in-memory mock

```bash
pnpm --filter @vaultic/storage add -D fake-indexeddb
```

Test cases:
- [ ] `putItem()` stores item, `getItem()` retrieves it
- [ ] `getAllItems()` returns all stored items
- [ ] `deleteItem()` removes item
- [ ] `putItem()` with existing ID updates the item
- [ ] Sync queue: `enqueue()` and `dequeue()` work correctly

### 3.5 Tests for @vaultic/api (Priority 4)
**File:** `packages/api/src/__tests__/api-client.test.ts`

**Approach:** Mock HTTP layer (ofetch). Test request construction, not server behavior.

Test cases:
- [ ] `login()` sends correct payload to `/auth/login`
- [ ] `register()` sends correct payload to `/auth/register`
- [ ] `syncPush()` sends correct payload to `/sync/push`
- [ ] `syncPurge()` sends DELETE to `/sync/purge`
- [ ] Auth header included when token is set
- [ ] 401 response triggers token refresh

### 3.6 Update turbo.json Test Task
Already done in Phase 1.3. Ensure `test` script exists in each package's `package.json`:
```json
"scripts": {
  "test": "vitest run"
}
```

## Todo
- [ ] 3.1 Install vitest + setup workspace config
- [ ] 3.2 Write @vaultic/crypto tests
- [ ] 3.3 Write @vaultic/sync tests
- [ ] 3.4 Write @vaultic/storage tests (with fake-indexeddb)
- [ ] 3.5 Write @vaultic/api tests
- [ ] 3.6 Add `test` script to each package.json
- [ ] Verify: `pnpm test` runs all tests from root
- [ ] Verify: All tests pass

## Risk
- WebCrypto API availability in Node.js test environment → Node 15+ has `crypto.subtle`
- IndexedDB mocking may not match browser behavior exactly → use `fake-indexeddb`
- ofetch mocking — may need `msw` or manual mock
