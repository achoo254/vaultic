// Zustand auth state for web app — manages login, lock, unlock, session persistence
// Adapted from extension auth-store: uses web-storage instead of chrome.storage

import { create } from 'zustand';
import { deriveKeys, deriveMasterKeyWithSalt, deriveEncryptionKeyWithBytes } from '@vaultic/crypto';
import { uint8ToBase64, base64ToUint8, computeVerifier } from '@vaultic/crypto';
import type { VaultMode, VaultConfig } from '@vaultic/types';
import { performRegister, performLogin } from './auth-server-actions';
import {
  storeEncryptionKeyBytes,
  getEncryptionKey,
  clearEncryptionKey,
  getAccessToken,
  clearAccessToken,
  getUserInfo,
  clearUserInfo,
  storeVaultConfig,
  getVaultConfig,
  clearVaultConfig,
} from '../lib/web-storage';
import { startAutoLock, stopAutoLock } from '../lib/web-auto-lock';
import { API_BASE_URL } from '../lib/config';

type VaultState = 'no_vault' | 'locked' | 'unlocked';

interface AuthStoreState {
  isLocked: boolean;
  isLoggedIn: boolean;
  email: string | null;
  userId: string | null;
  vaultState: VaultState;
  mode: VaultMode;
}

interface AuthActions {
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setupOfflineVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  getCurrentUserId: () => string;
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

  register: async (email, password) => {
    const result = await performRegister(email, password);
    set(result);
    startAutoLock(() => get().lock());
  },

  login: async (email, password) => {
    const result = await performLogin(email, password);
    set(result);
    startAutoLock(() => get().lock());
  },

  setupOfflineVault: async (password) => {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const saltBase64 = uint8ToBase64(salt);
    const masterKey = await deriveMasterKeyWithSalt(password, salt);
    const { rawBytes } = await deriveEncryptionKeyWithBytes(masterKey);
    const verifier = await computeVerifier(rawBytes);

    const config: VaultConfig = {
      mode: 'offline',
      salt: saltBase64,
      authHashVerifier: verifier,
      createdAt: Date.now(),
    };
    await storeVaultConfig(config);
    await storeEncryptionKeyBytes(rawBytes);

    set({
      isLocked: false, isLoggedIn: false, email: null, userId: null,
      vaultState: 'unlocked', mode: 'offline',
    });
    startAutoLock(() => get().lock());
  },

  unlock: async (password) => {
    const config = await getVaultConfig();
    if (!config) throw new Error('No vault found — please set up your vault first');

    let rawBytes: ArrayBuffer;

    if (config.mode === 'online' && config.email) {
      const result = await deriveKeys(password, config.email);
      rawBytes = result.rawKeyBytes;
    } else {
      const salt = base64ToUint8(config.salt);
      const masterKey = await deriveMasterKeyWithSalt(password, salt);
      const result = await deriveEncryptionKeyWithBytes(masterKey);
      rawBytes = result.rawBytes;
    }

    const verifier = await computeVerifier(rawBytes);
    if (verifier !== config.authHashVerifier) {
      throw new Error('Wrong master password');
    }

    await storeEncryptionKeyBytes(rawBytes);
    set({ isLocked: false, vaultState: 'unlocked' });
    startAutoLock(() => get().lock());
  },

  lock: async () => {
    stopAutoLock();
    await clearEncryptionKey();
    set({ isLocked: true, vaultState: 'locked' });
  },

  logout: async () => {
    stopAutoLock();
    // Call web logout endpoint to clear httpOnly cookie
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/web/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    await clearEncryptionKey();
    await clearAccessToken();
    await clearUserInfo();
    await clearVaultConfig();
    set({
      isLocked: true, isLoggedIn: false, email: null, userId: null,
      vaultState: 'no_vault', mode: 'offline',
    });
  },

  hydrate: async () => {
    const config = await getVaultConfig();
    const encKey = await getEncryptionKey();
    const userInfo = await getUserInfo();
    const accessToken = await getAccessToken();

    if (config) {
      const vaultState: VaultState = encKey ? 'unlocked' : 'locked';
      set({
        vaultState,
        mode: config.mode,
        isLocked: !encKey,
        isLoggedIn: config.mode === 'online' && !!accessToken,
        email: config.email || userInfo?.email || null,
        userId: config.userId || userInfo?.userId || null,
      });
    } else {
      set({ vaultState: 'no_vault', mode: 'offline' });
    }
  },
}));
