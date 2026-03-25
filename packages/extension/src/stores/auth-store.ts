// Zustand auth state — manages login, lock, unlock, and session persistence
// Offline-first: master password unlock works without network

import { create } from 'zustand';
import { deriveKeys } from '@vaultic/crypto';
import type { AuthState } from '@vaultic/types';
import {
  storeEncryptionKey,
  getEncryptionKey,
  clearEncryptionKey,
  storeTokens,
  getTokens,
  clearTokens,
  storeUserInfo,
  getUserInfo,
  clearUserInfo,
  storeAuthHashVerifier,
  getAuthHashVerifier,
  clearAuthHashVerifier,
} from '../lib/session-storage';

interface AuthActions {
  /** Register new account (requires network) */
  register: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  /** Login with existing account (requires network for first login) */
  login: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  /** Unlock vault with master password (offline — derives key locally) */
  unlock: (password: string) => Promise<void>;
  /** Lock vault — clears encryption key from session */
  lock: () => Promise<void>;
  /** Logout — clears all stored data */
  logout: () => Promise<void>;
  /** Initialize state from stored session on popup open */
  hydrate: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLocked: true,
  isLoggedIn: false,
  email: null,
  userId: null,

  register: async (email, password, apiBaseUrl) => {
    email = email.toLowerCase().trim();
    const { encryption_key, auth_hash } = await deriveKeys(password, email);

    const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        auth_hash: auth_hash,
        argon2_params: { m: 65536, t: 3, p: 4 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }

    // Auto-login using already-derived keys (avoid double Argon2id)
    const loginRes = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, auth_hash }),
    });

    if (!loginRes.ok) {
      throw new Error('Registration succeeded but auto-login failed');
    }

    const data = await loginRes.json();
    await storeEncryptionKey(encryption_key);
    await storeTokens(data.access_token, data.refresh_token);
    await storeUserInfo(email, data.user_id);
    await storeAuthHashVerifier(auth_hash);

    set({ isLocked: false, isLoggedIn: true, email, userId: data.user_id });
  },

  login: async (email, password, apiBaseUrl) => {
    email = email.toLowerCase().trim();
    const { encryption_key, auth_hash } = await deriveKeys(password, email);

    const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, auth_hash }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
      throw new Error(err.error || 'Invalid credentials');
    }

    const data = await res.json();

    await storeEncryptionKey(encryption_key);
    await storeTokens(data.access_token, data.refresh_token);
    await storeUserInfo(email, data.user_id);
    await storeAuthHashVerifier(auth_hash);

    set({ isLocked: false, isLoggedIn: true, email, userId: data.user_id });
  },

  unlock: async (password) => {
    const { email } = get();
    if (!email) throw new Error('No account found — please login first');

    const { encryption_key, auth_hash } = await deriveKeys(password, email);

    // Verify password by comparing derived auth_hash with stored verifier
    const storedHash = await getAuthHashVerifier();
    if (storedHash && storedHash !== auth_hash) {
      throw new Error('Wrong master password');
    }

    await storeEncryptionKey(encryption_key);
    set({ isLocked: false });
  },

  lock: async () => {
    await clearEncryptionKey();
    set({ isLocked: true });
  },

  logout: async () => {
    await clearEncryptionKey();
    await clearTokens();
    await clearUserInfo();
    await clearAuthHashVerifier();
    set({ isLocked: true, isLoggedIn: false, email: null, userId: null });
  },

  hydrate: async () => {
    const userInfo = await getUserInfo();
    const encKey = await getEncryptionKey();
    const tokens = await getTokens();

    if (userInfo) {
      set({
        email: userInfo.email,
        userId: userInfo.userId,
        isLoggedIn: !!tokens,
        isLocked: !encKey,
      });
    }
  },
}));

// Listen for background auto-lock (enc_key removal) — registered once, outside store
chrome.storage.session.onChanged.addListener((changes) => {
  if ('enc_key' in changes && !changes.enc_key.newValue) {
    useAuthStore.setState({ isLocked: true });
  }
});
