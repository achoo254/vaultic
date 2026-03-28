# Brainstorm: Offline-First Login & Share

**Date:** 2026-03-28
**Status:** Agreed
**Scope:** Make login & share fully optional — users can use vault 100% offline

---

## Problem Statement

Current Vaultic extension requires:
1. **Register/Login** before using vault → blocks offline-only users
2. **Server connection** for share → can't share without account + network

Goal: both features become optional. User can install extension → set master password → use vault → share credentials — all without ever touching the server.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Password verification | Local-only verifier in IndexedDB | No server dependency, fast, proven pattern |
| URL data limit | Hard limit ~2KB + warning | Cross-browser safe, covers 95% credentials |
| Account upgrade | Re-encrypt + upload existing vault | Seamless UX, same master password |
| Share viewer | Static page on existing API domain | No new infra, reuse nginx |
| First-run UX | Offline by default (master password setup) | Lowest friction, account optional |
| Share host | `api.vaultic.io/s#data` | Existing domain, no DNS changes |

---

## Architecture: Offline Vault Mode

### First-Run Flow (New)
```
Install Extension
    ↓
Set Master Password (2 fields: password + confirm)
    ↓
Derive keys locally:
  - encryption_key = Argon2id(password, random_salt) → AES-256-GCM key
  - auth_hash = SHA256(encryption_key) → stored as local verifier
  - salt stored in IndexedDB
    ↓
Vault ready (empty, offline)
    ↓
Optional: "Create Account" in Settings → upgrade flow
```

### Auth State Machine (Updated)
```
                    ┌──────────────┐
  Install ────────→ │  NO_VAULT    │ (first run, no data)
                    └──────┬───────┘
                           │ Set master password
                           ↓
                    ┌──────────────┐
                    │  UNLOCKED    │ ←── Offline mode (no account)
                    │  (offline)   │
                    └──────┬───────┘
                           │ Browser close / timeout
                           ↓
                    ┌──────────────┐
                    │  LOCKED      │ ←── Re-enter master password
                    │  (offline)   │     (verify via local hash)
                    └──────┬───────┘
                           │ Optional: Create Account
                           ↓
                    ┌──────────────┐
                    │  UNLOCKED    │ ←── Online mode (has account)
                    │  (online)    │     Sync + server share available
                    └──────────────┘
```

### Key Changes to auth-store.ts
- Add `mode: 'offline' | 'online'` state
- `isLoggedIn` no longer required for vault access
- New `setupOfflineVault(masterPassword)` method
- `upgradeToOnline(email, masterPassword)` for account creation
- Unlock flow: check local verifier first, no network needed (same as current lock screen)

### Storage Schema Addition
```typescript
// New: local vault config (IndexedDB)
interface VaultConfig {
  mode: 'offline' | 'online';
  salt: string;           // Argon2id salt (base64)
  authHashVerifier: string; // SHA256 of derived key (for offline verify)
  createdAt: number;
  // Online-only fields:
  email?: string;
  userId?: string;
}
```

---

## Architecture: URL-Based Offline Share

### Share Link Format
```
https://api.vaultic.io/s#v1.{iv}.{ciphertext}.{tag}

Components:
- v1           = format version
- {iv}         = 12-byte IV (base64url, 16 chars)
- {ciphertext} = AES-256-GCM encrypted data (base64url)
- {tag}        = NOT needed separately, GCM appends tag to ciphertext

Actual format:
https://api.vaultic.io/s#v1.{iv}.{ciphertext_with_tag}

Key: Derived from random 256-bit, encoded in fragment after data
Final: https://api.vaultic.io/s#v1.{iv}.{encrypted}.{key}
```

### Size Budget (~2KB URL limit)
```
URL base:                    ~30 chars
Fragment overhead (v1.):      3 chars
IV (base64url):              16 chars
Key (base64url):             43 chars
Separators:                   3 chars
─────────────────────────────────────
Available for ciphertext:  ~1905 chars → ~1428 bytes raw

Typical credential:
  username (50B) + password (50B) + url (100B) + notes (200B)
  = ~400 bytes → ~534 base64url chars ✅ fits easily

Edge case:
  Long notes (1000B+) → warning + truncate option
```

### Share Page (Static HTML)
```
api.vaultic.io/s → serves static share-page.html

Page behavior:
1. Parse URL fragment → extract version, iv, ciphertext, key
2. Show "Decrypt" button (no auto-decrypt for privacy)
3. On click: AES-256-GCM decrypt with extracted key
4. Display: structured fields if JSON, raw text otherwise
5. Copy to clipboard buttons
6. Warning: "Data exists only in this URL. Save it before closing."

No server calls needed. Pure client-side decryption.
```

### Dual Share Mode in Extension UI
```
┌─────────────────────────────┐
│  Share Credential           │
│                             │
│  ○ Offline (URL only)       │  ← Default for offline users
│    Data embedded in link    │
│    No expiry, no view limit │
│    ~2KB max                 │
│                             │
│  ○ Online (Server stored)   │  ← Available for logged-in users
│    Expiry & view limits     │
│    Larger data support      │
│    Requires account         │
│                             │
│  [Generate Share Link]      │
└─────────────────────────────┘
```

---

## Account Upgrade Flow

```
Offline User → Settings → "Create Account"
    ↓
Enter email (master password reused)
    ↓
Register with server (derive auth_hash from same password)
    ↓
mode: 'offline' → 'online'
    ↓
Prompt: "Enable Cloud Sync?"
  - Yes → push all local vault items to server
  - No  → keep local only, can enable later
    ↓
Server share now available alongside URL share
```

Key: master password stays the same → encryption_key unchanged → no re-encryption needed for local data. Server just needs auth_hash for login verification.

---

## Impact Analysis

### Files to Modify

**Extension (client/apps/extension/)**
- `stores/auth-store.ts` — Add offline mode, setupOfflineVault(), upgradeToOnline()
- `stores/vault-store.ts` — Remove login dependency for vault init
- `components/auth/` — New SetupPassword screen, modify LoginForm
- `components/share/` — Add offline share mode, URL generation
- `components/settings/` — Add "Create Account" section for offline users
- Router — Allow vault routes without isLoggedIn

**Packages**
- `@vaultic/crypto` — Add URL-safe share encrypt/decrypt helpers
- `@vaultic/storage` — Add VaultConfig schema for local vault metadata
- `@vaultic/api` — Make API calls conditional (skip if offline mode)

**Backend**
- `static/share-page.html` — Refactor to handle URL-fragment-only decryption (no server fetch)
- Share route — Keep existing server share alongside new static page

**Shared**
- `shared/types/` — Add VaultConfig type, share mode types

### Files NOT Changed
- Crypto core (Argon2id, AES-GCM) — same algorithms
- Sync engine — only activated when online
- Backend auth/sync routes — untouched, still needed for online users

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| User forgets offline master password → permanent data loss | High | Strong warning on setup, suggest backup |
| URL with encrypted data logged by proxy/ISP | Medium | Data encrypted, key in fragment (not sent to server). Acceptable risk. |
| URL too long for some browsers/apps | Medium | Hard 2KB limit + warning. Test on major browsers. |
| Upgrade flow bugs lose local vault | High | Backup vault to file before upgrade, atomic migration |
| Share page CDN/domain down = can't decrypt | Low | Static HTML, can self-host. Include "save page" option. |

---

## Security Considerations

1. **Offline verifier**: SHA256(encryption_key) stored locally. Attacker with IndexedDB access gets verifier but not key (need to brute-force Argon2id). Same security as current lock screen.
2. **URL share**: Full ciphertext in URL. Key also in URL fragment. Anyone with the full URL can decrypt. This is by design (same as current server share — anyone with link+fragment can decrypt).
3. **No recovery**: Offline mode = no server backup of auth. Lost password = lost vault. Must be clearly communicated.
4. **Fragment safety**: URL fragments (#...) are NOT sent in HTTP requests, NOT logged by servers. But browsers may store in history. Warn users.

---

## Success Metrics

- User can install → set password → add items → share — all without network
- Existing online users unaffected
- Offline share works cross-browser (Chrome, Firefox, Edge, Safari)
- Upgrade to account preserves all local data
- Share URL under 2KB for typical credentials

---

## Next Steps

1. Create implementation plan with phases
2. Priority order: Offline Vault Mode → URL Share → Account Upgrade → UI Polish
3. Estimated scope: ~15-20 files changed, no new packages needed
