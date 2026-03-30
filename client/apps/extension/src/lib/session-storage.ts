// Session storage helpers for encryption key, JWT tokens, and user info
// Encryption key: chrome.storage.session (cleared on browser close)
// JWT tokens + user info: chrome.storage.local (persists)

/** Store raw encryption key bytes in session storage (cleared on browser close).
 *  Preferred over storeEncryptionKey() — works with non-extractable CryptoKeys. */
export async function storeEncryptionKeyBytes(rawBytes: ArrayBuffer): Promise<void> {
  await chrome.storage.session.set({
    enc_key: Array.from(new Uint8Array(rawBytes)),
  });
}

/** @deprecated Use storeEncryptionKeyBytes() instead.
 *  Kept for any legacy call sites; requires an extractable CryptoKey. */
export async function storeEncryptionKey(key: CryptoKey): Promise<void> {
  const exported = await crypto.subtle.exportKey('raw', key);
  await storeEncryptionKeyBytes(exported);
}

/** Retrieve encryption key from session storage.
 *  Returns non-extractable CryptoKey — prevents key material leakage (ADV-07). */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const result = await chrome.storage.session.get('enc_key');
  if (!result.enc_key) return null;
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(result.enc_key),
    { name: 'AES-GCM' },
    false, // non-extractable — security hardening (ADV-07)
    ['encrypt', 'decrypt'],
  );
}

/** Clear encryption key from session storage (lock vault). */
export async function clearEncryptionKey(): Promise<void> {
  await chrome.storage.session.remove('enc_key');
}

/** Store JWT tokens in local storage (persists across sessions). */
export async function storeTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await chrome.storage.local.set({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

/** Retrieve JWT tokens from local storage. */
export async function getTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const result = await chrome.storage.local.get([
    'access_token',
    'refresh_token',
  ]);
  if (!result.access_token) return null;
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
  };
}

/** Clear JWT tokens from local storage. */
export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove(['access_token', 'refresh_token']);
}

/** Store user info in local storage. */
export async function storeUserInfo(
  email: string,
  userId: string,
): Promise<void> {
  await chrome.storage.local.set({ user_email: email, user_id: userId });
}

/** Retrieve user info from local storage. */
export async function getUserInfo(): Promise<{
  email: string;
  userId: string;
} | null> {
  const result = await chrome.storage.local.get(['user_email', 'user_id']);
  if (!result.user_email) return null;
  return { email: result.user_email, userId: result.user_id };
}

/** Clear user info from local storage. */
export async function clearUserInfo(): Promise<void> {
  await chrome.storage.local.remove(['user_email', 'user_id']);
}

/** @deprecated Do NOT call on new code paths — storing auth_hash in chrome.storage.local
 *  is a security risk (E-C1). Kept only for legacy migration reads in hydrate().
 *  New register/login/upgrade flows must NOT call this function. */
export async function storeAuthHashVerifier(authHash: string): Promise<void> {
  await chrome.storage.local.set({ auth_hash_verifier: authHash });
}

/** Retrieve auth hash verifier (used only for legacy migration in hydrate()). */
export async function getAuthHashVerifier(): Promise<string | null> {
  const result = await chrome.storage.local.get('auth_hash_verifier');
  return result.auth_hash_verifier || null;
}

/** Clear auth hash verifier from local storage. */
export async function clearAuthHashVerifier(): Promise<void> {
  await chrome.storage.local.remove('auth_hash_verifier');
}

/** Store VaultConfig in local storage. */
export async function storeVaultConfig(config: import('@vaultic/types').VaultConfig): Promise<void> {
  await chrome.storage.local.set({ vault_config: config });
}

/** Retrieve VaultConfig from local storage. */
export async function getVaultConfig(): Promise<import('@vaultic/types').VaultConfig | null> {
  const result = await chrome.storage.local.get('vault_config');
  return result.vault_config || null;
}

/** Clear VaultConfig from local storage. */
export async function clearVaultConfig(): Promise<void> {
  await chrome.storage.local.remove('vault_config');
}
