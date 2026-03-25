// Session storage helpers for encryption key, JWT tokens, and user info
// Encryption key: chrome.storage.session (cleared on browser close)
// JWT tokens + user info: chrome.storage.local (persists)

/** Store encryption key in session storage (cleared on browser close). */
export async function storeEncryptionKey(key: CryptoKey): Promise<void> {
  const exported = await crypto.subtle.exportKey('raw', key);
  await chrome.storage.session.set({
    enc_key: Array.from(new Uint8Array(exported)),
  });
}

/** Retrieve encryption key from session storage. */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const result = await chrome.storage.session.get('enc_key');
  if (!result.enc_key) return null;
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(result.enc_key),
    { name: 'AES-GCM' },
    false,
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

/** Store auth hash verifier for offline password verification. */
export async function storeAuthHashVerifier(authHash: string): Promise<void> {
  await chrome.storage.local.set({ auth_hash_verifier: authHash });
}

/** Retrieve auth hash verifier. */
export async function getAuthHashVerifier(): Promise<string | null> {
  const result = await chrome.storage.local.get('auth_hash_verifier');
  return result.auth_hash_verifier || null;
}

/** Clear auth hash verifier. */
export async function clearAuthHashVerifier(): Promise<void> {
  await chrome.storage.local.remove('auth_hash_verifier');
}
