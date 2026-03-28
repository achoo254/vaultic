# Phase 3: Account Upgrade Flow

## Overview
- **Priority:** P2
- **Status:** Complete
- **Effort:** 2h
- **Description:** Allow offline users to create account later, preserving vault data

## Context
- Depends on Phase 1 (offline vault mode exists)
- [Brainstorm report](../reports/brainstorm-260328-1053-offline-first-login-share.md)

## Key Insights
- Master password stays same → encryption_key unchanged → NO re-encryption needed
- Only need: derive auth_hash from same password → register with server
- Existing vault data stays in IndexedDB untouched
- Sync is separate opt-in after account creation

## Requirements

### Functional
- Settings page: "Create Account" section visible for offline users
- Enter email only (master password already set, reuse current password)
- Register with server → mode switches to 'online'
- Prompt: "Enable Cloud Sync?" after registration
- All local vault data preserved

### Non-Functional
- Atomic migration — if registration fails, stay offline (no partial state)
- No data loss during upgrade

## Architecture

### Upgrade Flow
```
Settings → "Create Account"
    ↓
Enter email (password already known from current session)
    ↓
Derive auth_hash from current encryption_key (already in session)
    ↓
POST /api/v1/auth/register { email, auth_hash, argon2_params }
    ↓
Receive tokens → store in chrome.storage.local
    ↓
Update VaultConfig: mode='online', email, userId
    ↓
Prompt: "Enable Cloud Sync?"
  - Yes → trigger full vault push
  - No → keep local only
```

### Key Insight: No Password Re-entry
Since vault is unlocked during upgrade, encryption_key is in session storage.
Derive auth_hash = SHA256(encryption_key) → same hash server expects.
No need to ask password again.

## Related Code Files

### Modify
| File | Change |
|------|--------|
| `client/apps/extension/src/stores/auth-store.ts` | Add `upgradeToOnline(email)` method |
| `client/apps/extension/src/components/settings/` | Add upgrade account section |

### Create
| File | Purpose |
|------|---------|
| `client/apps/extension/src/components/settings/upgrade-account-form.tsx` | Email input + upgrade button |

## Implementation Steps

### Step 1: Add upgradeToOnline() to auth-store
```typescript
async upgradeToOnline(email: string) {
  // 1. Get encryption_key from session storage
  const encKey = await chrome.storage.session.get('encryption_key');
  if (!encKey) throw new Error('Vault must be unlocked');

  // 2. Derive auth_hash (same as register flow)
  const authHash = await sha256(encKey.encryption_key);

  // 3. Get stored VaultConfig for Argon2 params
  const config = await chrome.storage.local.get('vault_config');

  // 4. Register with server
  const result = await apiClient.register({
    email,
    auth_hash: authHash,
    argon2_params: { m: 65536, t: 3, p: 4 },
    salt: config.vault_config.salt,
  });

  // 5. Store tokens
  await chrome.storage.local.set({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    user_id: result.user_id,
    email: email,
  });

  // 6. Update VaultConfig
  await chrome.storage.local.set({
    vault_config: {
      ...config.vault_config,
      mode: 'online',
      email,
      userId: result.user_id,
    }
  });

  // 7. Update store state
  set({ mode: 'online', email, userId: result.user_id, ... });
}
```

### Step 2: Create UpgradeAccountForm component
`client/apps/extension/src/components/settings/upgrade-account-form.tsx`:
- Email input field
- "Create Account" button
- Error handling (email taken, network error)
- Success → show "Enable Cloud Sync?" prompt
- Follow existing form patterns

### Step 3: Add to Settings page
- If `mode === 'offline'` → show UpgradeAccountForm section
- If `mode === 'online'` → show current account info (existing)
- Keep existing settings layout

### Step 4: Build & verify

## Todo List
- [x] Add `upgradeToOnline(email)` to auth-store.ts
- [x] Create `upgrade-account-form.tsx`
- [x] Add upgrade section to Settings page
- [x] Build & verify
- [x] Fixed upgradeToOnline to require password re-entry (security) (code review fix)

## Success Criteria
- Offline user → Settings → enter email → registers → mode becomes 'online'
- All vault items preserved
- Can now use server share
- Sync prompt appears after registration
- Network failure during registration → stays offline, no data loss

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Email already registered | Low | Show clear error, suggest login instead |
| Network fail mid-upgrade | Medium | Atomic: only update VaultConfig after server confirms |
| Vault data inconsistency | Low | No data migration — only auth state changes |

## Security Considerations
- auth_hash derived from session encryption_key — no password re-entry needed
- Server registration uses same auth_hash format as normal register
- Tokens stored same way as normal login flow
