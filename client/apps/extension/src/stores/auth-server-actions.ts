// Server-backed auth actions: register and login
// Extracted from auth-store.ts to keep it under 200 lines

import { deriveKeys } from '@vaultic/crypto';
import {
  storeEncryptionKeyBytes,
  storeTokens,
  storeUserInfo,
  storeVaultConfig,
} from '../lib/session-storage';
import { computeVerifier } from '@vaultic/crypto';

export interface ServerAuthResult {
  isLocked: false;
  isLoggedIn: true;
  email: string;
  userId: string;
  vaultState: 'unlocked';
  mode: 'online';
}

/** Register new account then auto-login. Returns derived state for Zustand set(). */
export async function performRegister(
  email: string,
  password: string,
  apiBaseUrl: string,
): Promise<ServerAuthResult> {
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

  if (!loginRes.ok) throw new Error('Registration succeeded but auto-login failed');

  const data = await loginRes.json();
  return persistServerSession(email, data, rawKeyBytes);
}

/** Login with existing credentials. Returns derived state for Zustand set(). */
export async function performLogin(
  email: string,
  password: string,
  apiBaseUrl: string,
): Promise<ServerAuthResult> {
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
  return persistServerSession(email, data, rawKeyBytes);
}

/** Store tokens, user info, vault config, and encryption key bytes after successful server auth. */
async function persistServerSession(
  email: string,
  data: { access_token: string; refresh_token: string; user_id: string },
  rawKeyBytes: ArrayBuffer,
): Promise<ServerAuthResult> {
  // NOTE: storeAuthHashVerifier removed — auth_hash must NOT persist (E-C1)
  await storeEncryptionKeyBytes(rawKeyBytes);
  await storeTokens(data.access_token, data.refresh_token);
  await storeUserInfo(email, data.user_id);

  const verifier = await computeVerifier(rawKeyBytes);
  await storeVaultConfig({
    mode: 'online',
    salt: email, // online mode uses email as salt
    authHashVerifier: verifier,
    createdAt: Date.now(),
    email,
    userId: data.user_id,
  });

  return {
    isLocked: false, isLoggedIn: true, email,
    userId: data.user_id, vaultState: 'unlocked', mode: 'online',
  };
}
