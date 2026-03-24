---
phase: 4
priority: critical
status: pending
estimated_days: 5
depends_on: [3]
---

# Phase 4: Extension Shell & Auth

## Overview
Build WXT extension with React: login/register screens, master password unlock, session management. Implement WebCrypto bridge matching Rust crypto output.

## Key Insights
- WebCrypto API mirrors Rust crypto (same AES-256-GCM, same nonce format)
- Encryption key stored in `chrome.storage.session` (cleared on browser close)
- Master password NEVER stored anywhere
- Auto-lock after 15min idle via background service worker alarm

## Architecture

```
packages/extension/
├── wxt.config.ts
├── src/
│   ├── entrypoints/
│   │   ├── popup/
│   │   │   ├── App.tsx          # Popup root (router)
│   │   │   ├── main.tsx         # React mount
│   │   │   └── index.html
│   │   ├── background.ts       # Service worker
│   │   └── options/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       └── index.html
│   ├── components/              # Extension-specific components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── MasterPasswordPrompt.tsx
│   │   └── LockScreen.tsx
│   ├── lib/
│   │   ├── crypto.ts            # WebCrypto bridge (AES-256-GCM, Argon2)
│   │   ├── api-client.ts        # Server API calls
│   │   ├── session.ts           # Session/lock management
│   │   └── storage.ts           # chrome.storage helpers
│   ├── stores/
│   │   └── auth-store.ts        # Zustand: auth state
│   └── assets/
│       └── styles.css           # Tailwind entry
└── tests/
    └── crypto.test.ts           # Interop tests with Rust vectors
```

## Implementation Steps

### 1. WebCrypto bridge — crypto.ts (4h)

```typescript
// Must match Rust vaultic-crypto output exactly

export async function deriveMasterKey(password: string, email: string): Promise<ArrayBuffer> {
  // Argon2id via argon2-browser WASM (WebCrypto doesn't support Argon2)
  // Import argon2-browser package
  const result = await argon2.hash({
    pass: password, salt: email,
    type: argon2.ArgonType.Argon2id,
    mem: 65536, time: 3, parallelism: 4,
    hashLen: 32
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

export async function encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plaintext);
  // Prepend nonce (same format as Rust)
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

Note: Argon2id not in WebCrypto. Use `argon2-browser` (WASM) or `hash-wasm` package.

### 2. Verify interop with Rust test vectors (2h)
Load `test-vectors.json` from Phase 2.
Run same inputs through WebCrypto bridge.
Assert identical outputs.

### 3. API client — api-client.ts (2h)
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = {
  register: (email: string, authHash: string, params: object) =>
    ofetch(`${API_BASE}/auth/register`, { method: 'POST', body: { email, auth_hash: authHash, argon2_params: params } }),
  login: (email: string, authHash: string) =>
    ofetch(`${API_BASE}/auth/login`, { method: 'POST', body: { email, auth_hash: authHash } }),
  // ... vault, sync, share endpoints
};
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

### 8. Popup routing (1h)
```
Popup opens →
  ├── No JWT? → Show LoginForm / RegisterForm
  ├── Has JWT but locked? → Show MasterPasswordPrompt
  └── Unlocked? → Show VaultList (Phase 5)
```

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
