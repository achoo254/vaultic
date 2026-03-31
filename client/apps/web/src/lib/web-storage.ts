// Web storage adapter — sessionStorage for session data, localStorage for persistent data
// Equivalent of extension's session-storage.ts but using web APIs

import type { VaultConfig } from '@vaultic/types';

// --- Encryption key (sessionStorage — cleared when tab closes) ---

/** Store raw encryption key bytes in sessionStorage. */
export async function storeEncryptionKeyBytes(rawBytes: ArrayBuffer): Promise<void> {
  const arr = Array.from(new Uint8Array(rawBytes));
  sessionStorage.setItem('enc_key', JSON.stringify(arr));
}

/** Retrieve encryption key from sessionStorage.
 *  Returns non-extractable CryptoKey (ADV-07 security hardening). */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const stored = sessionStorage.getItem('enc_key');
  if (!stored) return null;
  const arr = new Uint8Array(JSON.parse(stored));
  return crypto.subtle.importKey('raw', arr, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Clear encryption key (lock vault). */
export async function clearEncryptionKey(): Promise<void> {
  sessionStorage.removeItem('enc_key');
}

// --- Access token (sessionStorage — refresh is in httpOnly cookie) ---

/** Store access token in sessionStorage. */
export async function storeAccessToken(accessToken: string): Promise<void> {
  sessionStorage.setItem('access_token', accessToken);
}

/** Get access token. */
export async function getAccessToken(): Promise<string | null> {
  return sessionStorage.getItem('access_token');
}

/** Clear access token. */
export async function clearAccessToken(): Promise<void> {
  sessionStorage.removeItem('access_token');
}

// --- User info (localStorage — persists across sessions) ---

/** Store user info in localStorage. */
export async function storeUserInfo(email: string, userId: string): Promise<void> {
  localStorage.setItem('user_email', email);
  localStorage.setItem('user_id', userId);
}

/** Get user info. */
export async function getUserInfo(): Promise<{ email: string; userId: string } | null> {
  const email = localStorage.getItem('user_email');
  const userId = localStorage.getItem('user_id');
  if (!email) return null;
  return { email, userId: userId ?? '' };
}

/** Clear user info. */
export async function clearUserInfo(): Promise<void> {
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_id');
}

// --- Vault config (localStorage — persists) ---

/** Store VaultConfig in localStorage. */
export async function storeVaultConfig(config: VaultConfig): Promise<void> {
  localStorage.setItem('vault_config', JSON.stringify(config));
}

/** Get VaultConfig. */
export async function getVaultConfig(): Promise<VaultConfig | null> {
  const stored = localStorage.getItem('vault_config');
  return stored ? JSON.parse(stored) : null;
}

/** Clear VaultConfig. */
export async function clearVaultConfig(): Promise<void> {
  localStorage.removeItem('vault_config');
}
