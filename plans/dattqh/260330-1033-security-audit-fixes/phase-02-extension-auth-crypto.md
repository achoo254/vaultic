# Phase 2: Extension Auth & Crypto

## Context Links
- [Extension Audit](../reports/code-reviewer-260330-0936-extension-full-security-review.md)
- [Adversarial Review](../reports/code-reviewer-260330-0941-adversarial-security-review.md)
- [Client Packages Audit](../reports/code-reviewer-260330-0936-client-packages-deep-review.md)

## Overview
- **Priority:** P0
- **Status:** Completed
- **Effort:** 4h
- **Parallel-safe:** Yes — owns `auth-store.ts`, `session-storage.ts`, `crypto/kdf.ts`

## Items Covered

| # | ID | Severity | Issue |
|---|-----|----------|-------|
| 1 | E-C2/ADV-02 | P0 | upgradeToOnline — register first, re-encrypt on success |
| 2 | E-C1 | P0 | Stop storing auth_hash in chrome.storage.local |
| 5 | ADV-07 | P0 | Set encryption key extractable: false |

## Key Insights

- `upgradeToOnline()` re-encrypts ALL items (lines 291-302) BEFORE registering (lines 304-318). If registration fails, vault is irrecoverably corrupted — items encrypted with key nobody can derive.
- `storeAuthHashVerifier(auth_hash)` at lines 120, 165 stores the SERVER auth hash in chrome.storage.local. This is the actual server authentication credential, not the verifier. Any extension with `storage` permission can impersonate the user.
- `kdf.ts:54` creates encryption key with `extractable: true` because it needs to be exported for chrome.storage.session. The actual CryptoKey non-extractability protection is lost.

## Architecture

### E-C2 Fix: Register-First Upgrade Flow

```
CURRENT (broken):
  1. Re-encrypt items with new key   ← POINT OF NO RETURN
  2. Register with server             ← can fail
  3. Login                            ← can fail
  4. Re-tag user_id
  5. Store new config

FIXED:
  1. Register with server             ← fail = no harm done
  2. Login                            ← fail = no harm done
  3. Re-encrypt items with new key    ← only after success
  4. Re-tag user_id
  5. Store new config
```

### ADV-07 Fix: Non-extractable Key

The key needs to be exported to store in chrome.storage.session. Two options:
- (a) Keep extractable but minimize exposure (current approach)
- (b) Store the raw key bytes from derivation, import as non-extractable CryptoKey each time

**Decision: (b)** — Store raw bytes in session, import as non-extractable on each use. The raw bytes are already in session storage; making CryptoKey non-extractable adds a layer of defense for code that receives the CryptoKey object.

## Related Code Files

### Files to Modify
- `client/apps/extension/src/stores/auth-store.ts` — fix upgradeToOnline order, remove auth_hash storage
- `client/apps/extension/src/lib/session-storage.ts` — import key as non-extractable, remove storeAuthHashVerifier
- `client/packages/crypto/src/kdf.ts` — set extractable: false on deriveEncryptionKey

### Files to Create
- None

---

## Implementation Steps

### Item 1: Fix upgradeToOnline (E-C2/ADV-02)

File: `client/apps/extension/src/stores/auth-store.ts`, `upgradeToOnline` method (lines 261-370)

**Rewrite the function to register FIRST, then re-encrypt:**

```typescript
upgradeToOnline: async (email, password, apiBaseUrl) => {
  email = email.toLowerCase().trim();

  const config = await getVaultConfig();
  if (!config) throw new Error('No vault config found');

  // Must be unlocked to upgrade
  const currentKey = await getEncryptionKey();
  if (!currentKey) throw new Error('Vault must be unlocked to upgrade');

  // Derive new online keys (email as salt)
  const { encryption_key, auth_hash: authHash } = await deriveKeys(password, email);

  // Verify the user knows the current password
  const currentExported = await crypto.subtle.exportKey('raw', currentKey);
  const currentVerifier = await computeVerifier(currentExported);
  if (currentVerifier !== config.authHashVerifier) {
    throw new Error('Wrong master password');
  }

  // 1. REGISTER FIRST — if this fails, nothing changed
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        auth_hash: authHash,
        argon2_params: { m: 65536, t: 3, p: 4 },
      }),
    });
  } catch {
    throw new Error('Cannot connect to server');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }

  // 2. AUTO-LOGIN — if this fails, account exists but vault untouched
  let loginRes: Response;
  try {
    loginRes = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, auth_hash: authHash }),
    });
  } catch {
    throw new Error('Registration succeeded but auto-login failed');
  }
  if (!loginRes.ok) throw new Error('Registration succeeded but auto-login failed');
  const data = await loginRes.json();

  // 3. RE-ENCRYPT — only after registration+login succeed
  const store = new IndexedDBStore();
  const [items, folders] = await Promise.all([
    store.getAllItems('local'),
    store.getAllFolders('local'),
  ]);

  for (const item of items) {
    const plaintext = await decrypt(currentKey, item.encrypted_data);
    item.encrypted_data = await encrypt(encryption_key, plaintext);
    item.user_id = data.user_id;
    await store.putItem(item);
  }

  for (const folder of folders) {
    const plainName = await decrypt(currentKey, folder.encrypted_name);
    folder.encrypted_name = await encrypt(encryption_key, plainName);
    folder.user_id = data.user_id;
    await store.putFolder(folder);
  }

  // 4. Store new credentials + config
  await storeEncryptionKey(encryption_key);
  await storeTokens(data.access_token, data.refresh_token);
  await storeUserInfo(email, data.user_id);

  const exportedNewKey = await crypto.subtle.exportKey('raw', encryption_key);
  const newVerifier = await computeVerifier(exportedNewKey);
  await storeVaultConfig({
    ...config,
    mode: 'online',
    salt: email,
    authHashVerifier: newVerifier,
    email,
    userId: data.user_id,
  });

  set({ mode: 'online', isLoggedIn: true, email, userId: data.user_id });
},
```

Key changes:
- Registration + login happen BEFORE any re-encryption
- user_id re-tagging combined with re-encryption loop (single pass)
- Password verification added against currentVerifier
- `storeAuthHashVerifier()` call REMOVED (see Item 2)

---

### Item 2: Remove auth_hash Storage (E-C1)

**Problem:** `storeAuthHashVerifier(auth_hash)` stores the actual server auth hash (the value sent to the server for login) in `chrome.storage.local`. This is NOT the same as `authHashVerifier` stored in VaultConfig (which is `SHA256(encryption_key)`).

The naming is confusing because `session-storage.ts` has a function called `storeAuthHashVerifier` that stores `auth_hash_verifier` in local storage. This was used for legacy migration (hydrate function line 391).

**Fix:**

**Step 1: Remove calls to storeAuthHashVerifier in auth-store.ts**
- Line 120: `await storeAuthHashVerifier(auth_hash);` — REMOVE
- Line 165: `await storeAuthHashVerifier(auth_hash);` — REMOVE
- Line 355: `await storeAuthHashVerifier(authHash);` — REMOVE

The VaultConfig already stores `authHashVerifier` (SHA256 of key) for offline verification. The server auth_hash should NEVER be persisted.

**Step 2: Update hydrate() to not depend on legacy auth_hash**
Lines 389-409: The legacy migration uses `getAuthHashVerifier()` to build a VaultConfig. Since VaultConfig is now the canonical store, the legacy path only matters for users who haven't opened the extension since the VaultConfig was introduced. The migration should still work — it reads the legacy value once and writes VaultConfig. After that, the legacy key is unused.

**Step 3: Clean up session-storage.ts**
- Keep `storeAuthHashVerifier`, `getAuthHashVerifier`, `clearAuthHashVerifier` functions for backward compat during migration
- Add deprecation comment: these will be removed after all users have migrated
- In `clearAuthHashVerifier()`: also remove the legacy `auth_hash_verifier` key

**Step 4: Remove from logout()**
Line 253: `await clearAuthHashVerifier();` — keep this to clean up legacy data

---

### Item 5: Non-extractable Encryption Key (ADV-07)

**Goal:** CryptoKey objects used for encrypt/decrypt should be non-extractable. Raw bytes stored in session are acceptable (chrome.storage.session is cleared on browser close and scoped to extension).

**Step 1: Update kdf.ts — set extractable: false**
File: `client/packages/crypto/src/kdf.ts`, line 54
```typescript
// Change:
    true, // extractable — needed for chrome.storage.session export
// To:
    false, // non-extractable — raw bytes stored separately for session persistence
```

**Step 2: Update session-storage.ts — separate raw bytes and CryptoKey**

The `storeEncryptionKey` function currently exports the CryptoKey to raw bytes for storage. Since the key will now be non-extractable, we need to store the raw bytes BEFORE creating the CryptoKey.

**New approach:** Store raw bytes during key derivation, not after.

File: `client/apps/extension/src/lib/session-storage.ts`

```typescript
/** Store encryption key raw bytes in session storage. */
export async function storeEncryptionKeyBytes(rawBytes: ArrayBuffer): Promise<void> {
  await chrome.storage.session.set({
    enc_key: Array.from(new Uint8Array(rawBytes)),
  });
}

/** Retrieve encryption key from session storage (non-extractable). */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const result = await chrome.storage.session.get('enc_key');
  if (!result.enc_key) return null;
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(result.enc_key),
    { name: 'AES-GCM' },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );
}
```

**Step 3: Update auth-store.ts callers**

In `register()`, `login()`, `setupOfflineVault()`, `unlock()`, `upgradeToOnline()`:
- Before calling `storeEncryptionKey(key)`, export raw bytes first
- Call `storeEncryptionKeyBytes(rawBytes)` instead

But wait — if `deriveEncryptionKey` now returns non-extractable key, we can't export it. Solution: **the HKDF step should output raw bytes (deriveBits), and we store those bytes + import as non-extractable CryptoKey separately.**

**Revised approach for kdf.ts:**

Add a new function that returns both raw bytes and CryptoKey:
```typescript
/** Derive encryption key, returning both raw bytes (for storage) and non-extractable CryptoKey. */
export async function deriveEncryptionKeyWithBytes(
  masterKey: ArrayBuffer,
): Promise<{ key: CryptoKey; rawBytes: ArrayBuffer }> {
  const hkdfKey = await crypto.subtle.importKey('raw', masterKey, 'HKDF', false, ['deriveBits']);
  const rawBytes = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: HKDF_INFO_ENC },
    hkdfKey,
    256,
  );
  const key = await crypto.subtle.importKey(
    'raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
  );
  return { key, rawBytes };
}
```

Update `deriveKeys` to use this function. The `rawBytes` are passed to `storeEncryptionKeyBytes()` and the verifier is computed from `rawBytes` directly (no need to export CryptoKey).

This is the cleanest approach:
1. `deriveEncryptionKeyWithBytes()` → returns `{ key (non-extractable), rawBytes }`
2. `storeEncryptionKeyBytes(rawBytes)` → stores bytes in session
3. `getEncryptionKey()` → imports bytes as non-extractable CryptoKey
4. `computeVerifier(rawBytes)` → SHA256 of raw bytes (unchanged)

**Step 4: Keep backward compat for existing `deriveEncryptionKey`**
Keep the existing function but set `extractable: false`. Only the auth-store upgrade/register/login paths need raw bytes — they use the new `deriveEncryptionKeyWithBytes`.

---

## Todo List

- [x] Rewrite `upgradeToOnline()` to register+login BEFORE re-encryption
- [x] Add password verification check in `upgradeToOnline()` before proceeding
- [x] Combine re-encryption + user_id re-tagging into single loop
- [x] Remove `storeAuthHashVerifier(auth_hash)` calls from register, login, upgrade (3 locations)
- [x] Add `deriveEncryptionKeyWithBytes()` to kdf.ts returning raw bytes + non-extractable key
- [x] Set `extractable: false` in `deriveEncryptionKey()` (kdf.ts line 54)
- [x] Add `storeEncryptionKeyBytes(rawBytes)` to session-storage.ts
- [x] Update `getEncryptionKey()` to import as non-extractable (session-storage.ts)
- [x] Update auth-store register/login/setup/unlock to use new key storage flow
- [x] Update `computeVerifier` callers to use rawBytes directly (not export from CryptoKey)
- [x] Run `tsc --noEmit` for client
- [x] Run `pnpm test` for crypto package
- [x] Manually test: register, login, offline setup, unlock, upgrade flows

## Success Criteria

1. upgradeToOnline: registration failure leaves vault intact (old key still works)
2. `chrome.storage.local` no longer contains `auth_hash_verifier` after fresh register/login
3. `crypto.subtle.exportKey('raw', key)` throws on the CryptoKey returned by `getEncryptionKey()`
4. All vault operations (encrypt/decrypt) still work with non-extractable key
5. `tsc --noEmit` passes, existing tests pass

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Re-encryption interruption during upgrade (power loss, crash) | Low | High | Items are re-encrypted one-by-one in IndexedDB; partial re-encryption leaves some items with old key, some with new. Mitigation: could backup first, but adds complexity. Accept for MVP — partial corruption is better than guaranteed corruption (current). |
| Non-extractable key breaks verifier computation | Low | High | Compute verifier from raw bytes before importing as CryptoKey — never need to export. |
| Legacy users with auth_hash in local storage | Medium | Low | Legacy value becomes dead data — cleaned up on logout. No security regression from leaving it. |

## Security Considerations

- Removing auth_hash from local storage eliminates credential replay attack vector
- Non-extractable CryptoKey prevents supply-chain attacks from accessing key via WebCrypto API
- Register-first upgrade eliminates the irrecoverable vault corruption scenario
- Raw bytes in chrome.storage.session are acceptable: scoped to extension, cleared on browser close

## Next Steps

- Phase 5 will modularize auth-store.ts (currently 443 lines — extract upgradeToOnline, helper functions)
- Consider adding a backup mechanism for re-encryption in future (snapshot old encrypted data)
