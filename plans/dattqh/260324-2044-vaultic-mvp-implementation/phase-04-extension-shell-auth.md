---
phase: 4
priority: critical
status: pending
estimated_days: 5
depends_on: [3]
---

# Phase 4: Extension Shell & Auth

## Overview
Build WXT extension with React: login/register screens, master password unlock, session management. Implement WebCrypto bridge matching Rust crypto output. **Offline-first**: register requires network, but after first login all vault ops work offline.

## Key Insights
- **Registration requires network** (mandatory — Option A decision)
- **After first login, vault works 100% offline** — master password unlocks local IndexedDB
- WebCrypto API mirrors Rust crypto (same AES-256-GCM, same nonce format)
- Encryption key stored in `chrome.storage.session` (cleared on browser close)
- Master password NEVER stored anywhere
- Auto-lock after 15min idle via background service worker alarm
- JWT tokens stored for sync when online — not required for local vault access

## Architecture

Extension is a **thin UI layer** — imports business logic from shared packages.

```
packages/extension/                    # UI layer only
├── wxt.config.ts
├── src/
│   ├── entrypoints/
│   │   ├── popup/
│   │   │   ├── App.tsx               # Popup root (router)
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   └── background.ts            # Service worker
│   ├── components/
│   │   └── auth/                     # Extension-specific auth UI
│   │       ├── LoginForm.tsx
│   │       ├── RegisterForm.tsx
│   │       ├── MasterPasswordPrompt.tsx
│   │       └── LockScreen.tsx
│   ├── stores/
│   │   └── auth-store.ts            # Zustand: auth state
│   ├── hooks/
│   │   └── use-auth.ts              # Auth hook wrapping store + crypto
│   └── assets/
│       └── styles.css
│
│── Imports from shared packages:
│   @vaultic/crypto   → deriveMasterKey, deriveEncryptionKey, deriveAuthHash
│   @vaultic/api      → authApi.register, authApi.login, authApi.refresh
│   @vaultic/storage  → IndexedDBVaultStore (session persistence)
│   @vaultic/types    → User, AuthState types
│   @vaultic/ui       → Button, Input, Dialog components
```

## Implementation Steps

### 1. Implement packages/crypto (4h)

All crypto code lives in `packages/crypto/` — shared by all platforms.

```typescript
// packages/crypto/src/kdf.ts — Must match Rust vaultic-crypto output exactly
import argon2 from 'argon2-browser';

export async function deriveMasterKey(password: string, email: string): Promise<ArrayBuffer> {
  const result = await argon2.hash({
    pass: password, salt: email,
    type: argon2.ArgonType.Argon2id,
    mem: 65536, time: 3, parallelism: 4, hashLen: 32
  });
  return result.hash;
}

export async function deriveEncryptionKey(masterKey: ArrayBuffer): Promise<CryptoKey> {
  const hkdfKey = await crypto.subtle.importKey('raw', masterKey, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('vaultic-enc') },
    hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// packages/crypto/src/cipher.ts
export async function encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plaintext);
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return result;
}

export async function decrypt(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const nonce = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext);
  return new Uint8Array(plaintext);
}
```

Note: Argon2id not in WebCrypto. Use `argon2-browser` (WASM) in `packages/crypto`.

### 2. Verify interop with Rust test vectors (2h)
Load `test-vectors.json` from Phase 2.
Run same inputs through WebCrypto bridge.
Assert identical outputs.

### 3. Implement packages/api auth endpoints (2h)
```typescript
// packages/api/src/auth-api.ts
import type { ApiClient } from './client';

export function createAuthApi(client: ApiClient) {
  return {
    register: (email: string, authHash: string, params: object) =>
      client('/auth/register', { method: 'POST', body: { email, auth_hash: authHash, argon2_params: params } }),
    login: (email: string, authHash: string) =>
      client('/auth/login', { method: 'POST', body: { email, auth_hash: authHash } }),
    refresh: (refreshToken: string) =>
      client('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken } }),
  };
}
```

### 4. Auth store — Zustand (1h)
```typescript
interface AuthState {
  isLocked: boolean;
  isLoggedIn: boolean;
  email: string | null;
  accessToken: string | null;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### 5. Login/Register UI (3h)
- `LoginForm.tsx` — **Screen 02**: email + master password → derive keys → call API → store JWT + enc_key
- `RegisterForm.tsx` — **Screen 01**: email + master password + confirm → derive keys → register → auto-login
- `MasterPasswordPrompt.tsx` — **Screen 03**: shown after auto-lock, re-derive enc_key
- `LockScreen.tsx` — **Screen 03**: shown when vault is locked
- Error states: red border on input + error message below (**Screen 21** patterns)

### 6. Background service worker (3h)
```typescript
// background.ts
export default defineBackground(() => {
  // Auto-lock alarm
  browser.alarms.create('auto-lock', { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'auto-lock') {
      checkIdleAndLock(15); // 15 min timeout
    }
  });

  // Listen for messages from popup/content scripts
  browser.runtime.onMessage.addListener(handleMessage);
});
```

### 7. Session management — storage.ts (2h)
```typescript
// Store encryption key in session storage (cleared on browser close)
export async function storeEncryptionKey(key: CryptoKey) {
  const exported = await crypto.subtle.exportKey('raw', key);
  await chrome.storage.session.set({ enc_key: Array.from(new Uint8Array(exported)) });
}

export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const { enc_key } = await chrome.storage.session.get('enc_key');
  if (!enc_key) return null;
  return crypto.subtle.importKey('raw', new Uint8Array(enc_key), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// JWT stored in chrome.storage.local (persists)
export async function storeTokens(access: string, refresh: string) { ... }
```

### 8. Popup routing — offline-aware (1h)
```
Popup opens →
  ├── No local account? → Show RegisterForm (requires network)
  ├── Has local account but locked? → Show MasterPasswordPrompt (offline OK)
  ├── Unlocked? → Show VaultList (offline OK, sync if online)
  └── First login on this device? → Show LoginForm (requires network once)
```

Key difference from server-first: Master password unlock derives encryption key locally → opens IndexedDB → full vault access WITHOUT network. JWT only needed for sync/share.

## Design Verification Checklists

### Screen 01: Register
**Reference:** system-design.pen > Screen 01
- [ ] Extension frame: 380x520px
- [ ] Vaultic logo/icon centered at top
- [ ] "Create Account" heading: Inter 700, 24px, #18181B
- [ ] Email input: full width, border #E4E4E7, radius 8px
- [ ] Master password input: full width, eye toggle icon
- [ ] Confirm password input: full width, eye toggle icon
- [ ] Password strength indicator bar
- [ ] "Create Account" button: full width, bg #2563EB, white text, radius 8px
- [ ] "Already have an account? Log in" link: #2563EB
- [ ] Spacing between elements matches design
- [ ] Screenshot comparison: ≥90% PASS

### Screen 02: Login
**Reference:** system-design.pen > Screen 02
- [ ] Vaultic logo/icon centered at top
- [ ] "Welcome Back" heading
- [ ] Email input with label
- [ ] Master password input with eye toggle
- [ ] "Unlock" button: full width, primary color
- [ ] "Create account" link
- [ ] Error state: red border + error text (Screen 21 pattern)
- [ ] Screenshot comparison: ≥90% PASS

### Screen 03: Lock Screen
**Reference:** system-design.pen > Screen 03
- [ ] Lock icon centered
- [ ] User email displayed
- [ ] Master password input with eye toggle
- [ ] "Unlock" button: full width, primary color
- [ ] "Log out" link: secondary text color
- [ ] Screenshot comparison: ≥90% PASS

## Todo List
- [ ] WebCrypto bridge: deriveMasterKey (argon2-browser)
- [ ] WebCrypto bridge: deriveEncryptionKey (HKDF)
- [ ] WebCrypto bridge: deriveAuthHash
- [ ] WebCrypto bridge: encrypt/decrypt (AES-256-GCM)
- [ ] Interop test with Rust test vectors
- [ ] API client (ofetch)
- [ ] Zustand auth store
- [ ] LoginForm component
- [ ] RegisterForm component
- [ ] MasterPasswordPrompt component
- [ ] LockScreen component
- [ ] Background service worker (auto-lock alarm)
- [ ] Session management (chrome.storage.session)
- [ ] Popup routing (login → locked → vault)
- [ ] Error handling (network errors, wrong password)
- [ ] Extension builds for Chrome + Firefox

## Success Criteria
- WebCrypto output matches Rust test vectors byte-for-byte
- Register flow: create account → auto-login → see empty vault
- Login flow: enter credentials → unlock → see vault
- Auto-lock: after 15min idle, popup shows lock screen
- Re-unlock: enter master password → vault accessible again
- JWT refresh works transparently
- Extension builds for both Chrome and Firefox
