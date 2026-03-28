# Phase 1: Offline Vault Mode

## Overview
- **Priority:** P1 (Critical — foundation for all other phases)
- **Status:** Complete
- **Effort:** 5h
- **Description:** Enable users to create vault with master password only, no server registration required

## Context
- [Brainstorm report](../reports/brainstorm-260328-1053-offline-first-login-share.md)
- [Scout report](../reports/Explore-260328-1105-vaultic-auth-share.md)

## Key Insights
- `auth-store.ts` unlock flow already works offline (Argon2id local verify)
- Vault CRUD already offline-first (IndexedDB + sync queue)
- Main blocker: router gates vault behind `isLoggedIn` state
- `chrome.storage.session` for enc_key already proven pattern

## Requirements

### Functional
- User installs extension → sees "Set Master Password" screen (no login/register)
- Master password derives encryption key + local verifier
- Vault accessible immediately after setup
- "Log in" link available for users with existing accounts
- Lock/unlock works same as current (Argon2id local verify)

### Non-Functional
- Zero network calls during offline setup
- Same Argon2id params (m=65536, t=3, p=4)
- Backward compatible — existing logged-in users unaffected

## Architecture

### Auth State Machine
```
NO_VAULT → (set password) → UNLOCKED_OFFLINE
UNLOCKED_OFFLINE → (browser close) → LOCKED
LOCKED → (enter password) → UNLOCKED_OFFLINE or UNLOCKED_ONLINE
UNLOCKED_OFFLINE → (create account) → UNLOCKED_ONLINE
```

### New Type: VaultConfig
```typescript
// shared/types/src/vault-config.ts
export type VaultMode = 'offline' | 'online';

export interface VaultConfig {
  mode: VaultMode;
  salt: string;              // Argon2id salt (base64)
  authHashVerifier: string;  // SHA256(encryption_key) for offline verify
  createdAt: number;
  // Online-only:
  email?: string;
  userId?: string;
}
```

### Storage: VaultConfig in chrome.storage.local
Store `VaultConfig` in `chrome.storage.local` alongside existing user data. No IndexedDB schema change needed — chrome.storage.local is simpler and already used for auth data.

## Related Code Files

### Modify
| File | Change |
|------|--------|
| `shared/types/src/index.ts` | Export new VaultConfig type |
| `shared/types/src/vault-config.ts` | **CREATE** — VaultConfig interface |
| `client/apps/extension/src/stores/auth-store.ts` | Add offline mode, `setupOfflineVault()`, refactor state |
| `client/apps/extension/src/entrypoints/popup/app.tsx` | Update router: allow vault without `isLoggedIn` |
| `client/apps/extension/src/components/auth/setup-password-form.tsx` | **CREATE** — First-run master password setup |
| `client/apps/extension/src/components/auth/login-form.tsx` | Add "Use Offline" / back to setup link |

## Implementation Steps

### Step 1: Add VaultConfig type
1. Create `shared/types/src/vault-config.ts` with `VaultMode` and `VaultConfig`
2. Export from `shared/types/src/index.ts`

### Step 2: Refactor auth-store.ts
Current state shape:
```typescript
{ isLocked, isLoggedIn, email, userId, accessToken, refreshToken }
```

New state shape:
```typescript
{
  vaultState: 'no_vault' | 'locked' | 'unlocked',
  mode: 'offline' | 'online',
  // Online-only:
  email?: string,
  userId?: string,
  accessToken?: string,
  refreshToken?: string,
}
```

Key changes:
1. Add `mode: VaultMode` field (default: check chrome.storage.local for VaultConfig)
2. Add `vaultState: 'no_vault' | 'locked' | 'unlocked'` — replaces `isLocked` + `isLoggedIn` combo
3. Keep `isLoggedIn` and `isLocked` as computed getters for backward compat:
   - `isLoggedIn` = `mode === 'online' && !!accessToken`
   - `isLocked` = `vaultState === 'locked'`
   - `hasVault` = `vaultState !== 'no_vault'` (NEW — for router)
4. Add `setupOfflineVault(masterPassword: string)`:
   - Generate random salt (32 bytes)
   - Derive encryption_key via Argon2id + HKDF (reuse existing `deriveKeys`)
   - Compute auth_hash_verifier = SHA256(encryption_key)
   - Store VaultConfig in chrome.storage.local
   - Store encryption_key in chrome.storage.session
   - Set `vaultState: 'unlocked'`, `mode: 'offline'`
5. Modify `hydrate()`:
   - Check chrome.storage.local for VaultConfig
   - If VaultConfig exists AND no session key → `vaultState: 'locked'`
   - If VaultConfig exists AND session key → `vaultState: 'unlocked'`
   - If no VaultConfig → `vaultState: 'no_vault'`
   - Set `mode` from VaultConfig
6. Modify `unlock(masterPassword)`:
   - Load VaultConfig (salt + verifier) from chrome.storage.local
   - Derive key from password + salt
   - Compare SHA256(derived_key) with stored verifier
   - If match → store key in session, set `vaultState: 'unlocked'`

### Step 3: Create SetupPasswordForm component
New file: `client/apps/extension/src/components/auth/setup-password-form.tsx`
- Two password fields (password + confirm)
- Password strength indicator (reuse existing if any)
- Warning: "No recovery if you forget this password"
- "Create Vault" button → calls `setupOfflineVault()`
- Bottom link: "Have an account? Log in"
- Follow existing form patterns from `register-form.tsx`

### Step 4: Update router (app.tsx)
Current routing logic:
```
if (!isLoggedIn) → show Login/Register
if (isLocked) → show LockScreen
else → show Vault
```

New routing logic:
```
if (vaultState === 'no_vault') → show SetupPasswordForm (with "Log in" link)
if (vaultState === 'locked') → show LockScreen
if (vaultState === 'unlocked') → show Vault
```

Key: vault access no longer depends on `isLoggedIn`. Only `vaultState` matters for navigation.

### Step 5: Update LoginForm
- Add link at bottom: "← Use without account" → navigates to SetupPasswordForm
- Keep all existing login logic unchanged

### Step 6: Compile & verify
- Run `pnpm build` in affected packages
- Verify no type errors
- Test: install fresh extension → should see SetupPasswordForm

## Todo List
- [x] Create `shared/types/src/vault-config.ts`
- [x] Export from `shared/types/src/index.ts`
- [x] Refactor `auth-store.ts` — add mode, vaultState, setupOfflineVault(), update hydrate/unlock
- [x] Create `setup-password-form.tsx`
- [x] Update `app.tsx` router logic
- [x] Update `login-form.tsx` — add "Use without account" link
- [x] Build & verify no compile errors
- [x] Auto-migrate legacy users to VaultConfig during hydrate (code review fix)

## Success Criteria
- Fresh install → SetupPasswordForm shown (not Login)
- Set master password → vault unlocked, empty, fully functional
- Close browser → reopen → LockScreen shown → enter password → vault unlocked
- Existing online user flow unchanged
- No network calls during offline setup/unlock

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing online users | High | Keep `isLoggedIn` getter, test both flows |
| Lost vault on forgotten password | High | Bold warning on setup screen |
| Chrome storage limits | Low | VaultConfig is <1KB, well within limits |

## Security Considerations
- auth_hash_verifier = SHA256(encryption_key) — attacker needs brute-force Argon2id
- Same security level as current lock screen's stored verifier
- No plaintext password stored anywhere
- Encryption key only in session storage (cleared on browser close)
