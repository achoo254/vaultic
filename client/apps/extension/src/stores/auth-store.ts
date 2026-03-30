// Zustand auth state — manages login, lock, unlock, and session persistence
// Supports both offline (local-only) and online (server-backed) vault modes

import { create } from 'zustand';
import { deriveKeys, deriveMasterKeyWithSalt, deriveEncryptionKeyWithBytes, encrypt, decrypt } from '@vaultic/crypto';
import { IndexedDBStore } from '@vaultic/storage';
import type { AuthState } from '@vaultic/types';
import type { VaultMode, VaultConfig } from '@vaultic/types';
import {
  storeEncryptionKeyBytes,
  getEncryptionKey,
  clearEncryptionKey,
  storeTokens,
  getTokens,
  clearTokens,
  storeUserInfo,
  getUserInfo,
  clearUserInfo,
  clearAuthHashVerifier,
  getAuthHashVerifier,
  storeVaultConfig,
  getVaultConfig,
  clearVaultConfig,
} from '../lib/session-storage';

type VaultState = 'no_vault' | 'locked' | 'unlocked';

interface AuthStoreState extends AuthState {
  vaultState: VaultState;
  mode: VaultMode;
}

interface AuthActions {
  /** Register new account (requires network) */
  register: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  /** Login with existing account (requires network for first login) */
  login: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  /** Set up offline vault with master password only (no network) */
  setupOfflineVault: (password: string) => Promise<void>;
  /** Unlock vault with master password (offline — derives key locally) */
  unlock: (password: string) => Promise<void>;
  /** Lock vault — clears encryption key from session */
  lock: () => Promise<void>;
  /** Logout — clears all stored data */
  logout: () => Promise<void>;
  /** Upgrade offline vault to online account (requires password re-entry) */
  upgradeToOnline: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  /** Initialize state from stored session on popup open */
  hydrate: () => Promise<void>;
  /** Returns current userId for IndexedDB scoping: JWT userId or "local" */
  getCurrentUserId: () => string;
  /** Computed: has an active vault (offline or online) */
  readonly hasVault: boolean;
}

type AuthStore = AuthStoreState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLocked: true,
  isLoggedIn: false,
  email: null,
  userId: null,
  vaultState: 'no_vault',
  mode: 'offline',

  get hasVault() {
    return get().vaultState !== 'no_vault';
  },

  getCurrentUserId: () => {
    const { mode, userId } = get();
    return mode === 'online' && userId ? userId : 'local';
  },

  register: async (email, password, apiBaseUrl) => {
    email = email.toLowerCase().trim();
    const { auth_hash, rawKeyBytes } = await deriveKeys(password, email);

    let res: Response;
    try {
      res = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          auth_hash,
          argon2_params: { m: 65536, t: 3, p: 4 },
        }),
      });
    } catch {
      throw new Error('Cannot connect to server. Please check that the Vaultic server is running.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }

    // Auto-login using already-derived keys (avoid double Argon2id)
    let loginRes: Response;
    try {
      loginRes = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, auth_hash }),
      });
    } catch {
      throw new Error('Registration succeeded but cannot connect for auto-login');
    }

    if (!loginRes.ok) {
      throw new Error('Registration succeeded but auto-login failed');
    }

    const data = await loginRes.json();
    // Store raw bytes (non-extractable key cannot be exported)
    await storeEncryptionKeyBytes(rawKeyBytes);
    await storeTokens(data.access_token, data.refresh_token);
    await storeUserInfo(email, data.user_id);
    // NOTE: storeAuthHashVerifier removed — auth_hash must NOT persist to chrome.storage.local (E-C1)

    // Verifier computed from raw key bytes (no exportKey needed)
    const verifier = await computeVerifier(rawKeyBytes);
    await storeVaultConfig({
      mode: 'online',
      salt: email, // online mode uses email as salt
      authHashVerifier: verifier,
      createdAt: Date.now(),
      email,
      userId: data.user_id,
    });

    set({
      isLocked: false, isLoggedIn: true, email, userId: data.user_id,
      vaultState: 'unlocked', mode: 'online',
    });
  },

  login: async (email, password, apiBaseUrl) => {
    email = email.toLowerCase().trim();
    const { auth_hash, rawKeyBytes } = await deriveKeys(password, email);

    let res: Response;
    try {
      res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, auth_hash }),
      });
    } catch {
      throw new Error('Cannot connect to server. Please check that the Vaultic server is running.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
      throw new Error(err.error || 'Invalid credentials');
    }

    const data = await res.json();
    // Store raw bytes (non-extractable key cannot be exported)
    await storeEncryptionKeyBytes(rawKeyBytes);
    await storeTokens(data.access_token, data.refresh_token);
    await storeUserInfo(email, data.user_id);
    // NOTE: storeAuthHashVerifier removed — auth_hash must NOT persist to chrome.storage.local (E-C1)

    // Verifier computed from raw key bytes (no exportKey needed)
    const verifier = await computeVerifier(rawKeyBytes);
    await storeVaultConfig({
      mode: 'online',
      salt: email,
      authHashVerifier: verifier,
      createdAt: Date.now(),
      email,
      userId: data.user_id,
    });

    set({
      isLocked: false, isLoggedIn: true, email, userId: data.user_id,
      vaultState: 'unlocked', mode: 'online',
    });
  },

  setupOfflineVault: async (password) => {
    // Generate random 32-byte salt
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const saltBase64 = uint8ToBase64(salt);

    // Derive encryption key via Argon2id + HKDF
    const masterKey = await deriveMasterKeyWithSalt(password, salt);
    const { key: encryptionKey, rawBytes } = await deriveEncryptionKeyWithBytes(masterKey);

    // Compute verifier = SHA256(raw encryption key bytes)
    const verifier = await computeVerifier(rawBytes);

    // Store VaultConfig
    const config: VaultConfig = {
      mode: 'offline',
      salt: saltBase64,
      authHashVerifier: verifier,
      createdAt: Date.now(),
    };
    await storeVaultConfig(config);

    // Store raw key bytes in session (non-extractable key cannot be exported)
    await storeEncryptionKeyBytes(rawBytes);

    set({
      isLocked: false, isLoggedIn: false, email: null, userId: null,
      vaultState: 'unlocked', mode: 'offline',
    });
  },

  unlock: async (password) => {
    const config = await getVaultConfig();
    if (!config) throw new Error('No vault found — please set up your vault first');

    let rawBytes: ArrayBuffer;

    if (config.mode === 'online' && config.email) {
      // Online mode: derive from password + email
      const result = await deriveKeys(password, config.email);
      rawBytes = result.rawKeyBytes;
    } else {
      // Offline mode: derive from password + stored salt
      const salt = base64ToUint8(config.salt);
      const masterKey = await deriveMasterKeyWithSalt(password, salt);
      const result = await deriveEncryptionKeyWithBytes(masterKey);
      rawBytes = result.rawBytes;
    }

    // Verify password by comparing SHA256(key bytes) with stored verifier
    const verifier = await computeVerifier(rawBytes);
    if (verifier !== config.authHashVerifier) {
      throw new Error('Wrong master password');
    }

    await storeEncryptionKeyBytes(rawBytes);
    set({ isLocked: false, vaultState: 'unlocked' });
  },

  lock: async () => {
    await clearEncryptionKey();
    set({ isLocked: true, vaultState: 'locked' });
  },

  logout: async () => {
    await clearEncryptionKey();
    await clearTokens();
    await clearUserInfo();
    await clearAuthHashVerifier(); // clears any legacy auth_hash_verifier from storage
    await clearVaultConfig();
    set({
      isLocked: true, isLoggedIn: false, email: null, userId: null,
      vaultState: 'no_vault', mode: 'offline',
    });
  },

  upgradeToOnline: async (email, password, apiBaseUrl) => {
    email = email.toLowerCase().trim();

    // Must have vault config and be unlocked
    const config = await getVaultConfig();
    if (!config) throw new Error('No vault config found');

    const currentKey = await getEncryptionKey();
    if (!currentKey) throw new Error('Vault must be unlocked to upgrade');

    // Re-derive keys using password + email (proper auth_hash for server)
    const { encryption_key: newEncKey, auth_hash: authHash, rawKeyBytes: newRawBytes } = await deriveKeys(password, email);

    // Verify the supplied password matches current vault before touching anything.
    // Compute verifier for new key and compare with stored — only valid if password
    // matches the current offline vault's password (same password, different salt/key).
    // NOTE: Online key (salt=email) differs from offline key (salt=random), so verifiers
    // will NOT match. Instead we verify via currentKey by re-deriving from current config.
    // For offline mode: re-derive with stored salt and verify against stored verifier.
    if (config.mode === 'offline') {
      const salt = base64ToUint8(config.salt);
      const masterKey = await deriveMasterKeyWithSalt(password, salt);
      const { rawBytes: currentRawBytes } = await deriveEncryptionKeyWithBytes(masterKey);
      const currentVerifier = await computeVerifier(currentRawBytes);
      if (currentVerifier !== config.authHashVerifier) {
        throw new Error('Wrong master password — cannot upgrade vault');
      }
    }

    // ── STEP 1: Register with server FIRST (vault unchanged on failure) ──
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

    // ── STEP 2: Auto-login to get JWT tokens + userId ──
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

    // ── STEP 3: Re-encrypt all vault items from old key to new key ──
    // Offline key (salt=random) differs from online key (salt=email),
    // so existing ciphertext must be re-encrypted before switching keys.
    const store = new IndexedDBStore();
    const [items, folders] = await Promise.all([
      store.getAllItems('local'),
      store.getAllFolders('local'),
    ]);

    // Re-encrypt items + re-tag userId in one pass
    for (const item of items) {
      const plaintext = await decrypt(currentKey, item.encrypted_data);
      item.encrypted_data = await encrypt(newEncKey, plaintext);
      item.user_id = data.user_id;
      await store.putItem(item);
    }

    // Re-encrypt folders + re-tag userId in one pass
    for (const folder of folders) {
      const plainName = await decrypt(currentKey, folder.encrypted_name);
      folder.encrypted_name = await encrypt(newEncKey, plainName);
      folder.user_id = data.user_id;
      await store.putFolder(folder);
    }

    // ── STEP 4: Persist new credentials + config ──
    // NOTE: storeAuthHashVerifier removed — auth_hash must NOT persist (E-C1)
    await storeEncryptionKeyBytes(newRawBytes);
    await storeTokens(data.access_token, data.refresh_token);
    await storeUserInfo(email, data.user_id);

    const newVerifier = await computeVerifier(newRawBytes);
    await storeVaultConfig({
      ...config,
      mode: 'online',
      salt: email, // online mode uses email as salt
      authHashVerifier: newVerifier,
      email,
      userId: data.user_id,
    });

    set({
      mode: 'online', isLoggedIn: true, email, userId: data.user_id,
    });
  },

  hydrate: async () => {
    const config = await getVaultConfig();
    const encKey = await getEncryptionKey();
    const userInfo = await getUserInfo();
    const tokens = await getTokens();

    if (config) {
      // Has vault config — determine state
      const vaultState: VaultState = encKey ? 'unlocked' : 'locked';
      set({
        vaultState,
        mode: config.mode,
        isLocked: !encKey,
        isLoggedIn: config.mode === 'online' && !!tokens,
        email: config.email || userInfo?.email || null,
        userId: config.userId || userInfo?.userId || null,
      });
    } else if (userInfo) {
      // Legacy: has user info but no VaultConfig — auto-migrate using stored auth_hash_verifier
      const storedHash = await getAuthHashVerifier();
      if (storedHash) {
        await storeVaultConfig({
          mode: 'online',
          salt: userInfo.email,
          authHashVerifier: storedHash,
          createdAt: Date.now(),
          email: userInfo.email,
          userId: userInfo.userId,
        });
      }
      set({
        email: userInfo.email,
        userId: userInfo.userId,
        isLoggedIn: !!tokens,
        isLocked: !encKey,
        vaultState: encKey ? 'unlocked' : 'locked',
        mode: 'online',
      });
    } else {
      // No vault at all
      set({ vaultState: 'no_vault', mode: 'offline' });
    }
  },
}));

// Helper: SHA256 hex of raw key bytes — used as verifier
async function computeVerifier(rawKeyBuffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', rawKeyBuffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Listen for background auto-lock (enc_key removal) — registered once, outside store
chrome.storage.session.onChanged.addListener((changes) => {
  if ('enc_key' in changes && !changes.enc_key.newValue) {
    useAuthStore.setState({ isLocked: true, vaultState: 'locked' });
  }
});
