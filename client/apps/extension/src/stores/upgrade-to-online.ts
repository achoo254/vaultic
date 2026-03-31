// Extracted: upgradeToOnline logic — register server account + re-encrypt vault
// Called by auth-store as a thin wrapper; dependencies injected as params

import { deriveKeys, deriveMasterKeyWithSalt, deriveEncryptionKeyWithBytes, encrypt, decrypt } from '@vaultic/crypto';
import { IndexedDBStore } from '@vaultic/storage';
import type { VaultConfig } from '@vaultic/types';
import {
  storeEncryptionKeyBytes,
  storeTokens,
  storeUserInfo,
  storeVaultConfig,
  getVaultConfig,
  getEncryptionKey,
} from '../lib/session-storage';
import { base64ToUint8, computeVerifier } from '@vaultic/crypto';

export interface UpgradeResult {
  mode: 'online';
  isLoggedIn: true;
  email: string;
  userId: string;
}

/**
 * Upgrade offline vault to online account:
 * 1. Verify current password against stored verifier (offline only)
 * 2. Register + auto-login with server
 * 3. Re-encrypt all vault items from old key → new key
 * 4. Persist new tokens, config, and encryption key
 */
export async function performUpgradeToOnline(
  email: string,
  password: string,
  apiBaseUrl: string,
): Promise<UpgradeResult> {
  email = email.toLowerCase().trim();

  const config = await getVaultConfig();
  if (!config) throw new Error('No vault config found');

  const currentKey = await getEncryptionKey();
  if (!currentKey) throw new Error('Vault must be unlocked to upgrade');

  // Re-derive keys for server (online key: salt = email)
  const { encryption_key: newEncKey, auth_hash: authHash, rawKeyBytes: newRawBytes } = await deriveKeys(password, email);

  // For offline mode: verify supplied password matches stored vault before mutating anything
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

  // ── STEP 3: Re-encrypt all vault items from old key → new key ──
  // Offline key (salt=random) differs from online key (salt=email),
  // so existing ciphertext must be re-encrypted before switching keys.
  const store = new IndexedDBStore();
  const [items, folders] = await Promise.all([
    store.getAllItems('local'),
    store.getAllFolders('local'),
  ]);

  for (const item of items) {
    const plaintext = await decrypt(currentKey, item.encrypted_data);
    item.encrypted_data = await encrypt(newEncKey, plaintext);
    item.user_id = data.user_id;
    await store.putItem(item);
  }

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
  const updatedConfig: VaultConfig = {
    ...config,
    mode: 'online',
    salt: email, // online mode uses email as salt
    authHashVerifier: newVerifier,
    email,
    userId: data.user_id,
  };
  await storeVaultConfig(updatedConfig);

  return { mode: 'online', isLoggedIn: true, email, userId: data.user_id };
}
