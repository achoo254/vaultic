// Zustand auth state — manages login, lock, unlock, and session persistence
// Supports both offline (local-only) and online (server-backed) vault modes

import { create } from 'zustand';
import { deriveKeys, deriveMasterKeyWithSalt, deriveEncryptionKeyWithBytes } from '@vaultic/crypto';
import type { AuthState } from '@vaultic/types';
import type { VaultMode, VaultConfig } from '@vaultic/types';
import { performRegister, performLogin } from './auth-server-actions';
import { performUpgradeToOnline } from './upgrade-to-online';
import {
  storeEncryptionKeyBytes,
  getEncryptionKey,
  clearEncryptionKey,
  getTokens,
  clearTokens,
  getUserInfo,
  clearUserInfo,
  clearAuthHashVerifier,
  getAuthHashVerifier,
  storeVaultConfig,
  getVaultConfig,
  clearVaultConfig,
} from '../lib/session-storage';
import { uint8ToBase64, base64ToUint8, computeVerifier } from '../lib/encoding-utils';

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
    // Delegates to extracted module — see stores/auth-server-actions.ts
    const result = await performRegister(email, password, apiBaseUrl);
    set(result);
  },

  login: async (email, password, apiBaseUrl) => {
    // Delegates to extracted module — see stores/auth-server-actions.ts
    const result = await performLogin(email, password, apiBaseUrl);
    set(result);
  },

  setupOfflineVault: async (password) => {
    // Generate random 32-byte salt
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const saltBase64 = uint8ToBase64(salt);

    // Derive encryption key via Argon2id + HKDF
    const masterKey = await deriveMasterKeyWithSalt(password, salt);
    const { rawBytes } = await deriveEncryptionKeyWithBytes(masterKey);

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

    // Trigger background sync after unlock (non-blocking)
    chrome.storage.local.get('sync_enabled').then(({ sync_enabled }) => {
      if (sync_enabled) {
        chrome.runtime.sendMessage({ type: 'SYNC_NOW' }).catch(() => {});
      }
    });
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
    // Delegates to extracted module — see stores/upgrade-to-online.ts
    const result = await performUpgradeToOnline(email, password, apiBaseUrl);
    set({ mode: result.mode, isLoggedIn: result.isLoggedIn, email: result.email, userId: result.userId });
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

// Listen for background auto-lock (enc_key removal) — registered once, outside store
chrome.storage.session.onChanged.addListener((changes) => {
  if ('enc_key' in changes && !changes.enc_key.newValue) {
    useAuthStore.setState({ isLocked: true, vaultState: 'locked' });
  }
});
