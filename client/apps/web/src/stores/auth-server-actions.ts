// Server-backed auth actions for web app — uses /web/login for httpOnly cookie auth
import { deriveKeys, computeVerifier } from '@vaultic/crypto';
import {
  storeEncryptionKeyBytes,
  storeAccessToken,
  storeUserInfo,
  storeVaultConfig,
} from '../lib/web-storage';
import { API_BASE_URL } from '../lib/config';

export interface ServerAuthResult {
  isLocked: false;
  isLoggedIn: true;
  email: string;
  userId: string;
  vaultState: 'unlocked';
  mode: 'online';
}

/** Register new account then auto-login via web endpoint. */
export async function performRegister(
  email: string,
  password: string,
): Promise<ServerAuthResult> {
  email = email.toLowerCase().trim();
  const { auth_hash, rawKeyBytes } = await deriveKeys(password, email);

  // Register (standard endpoint)
  const regRes = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, auth_hash, argon2_params: { m: 65536, t: 3, p: 4 } }),
  });

  if (!regRes.ok) {
    const err = await regRes.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }

  // Auto-login via web endpoint (sets httpOnly cookie)
  const loginRes = await fetch(`${API_BASE_URL}/api/v1/auth/web/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, auth_hash }),
  });

  if (!loginRes.ok) throw new Error('Registration succeeded but auto-login failed');

  const data = await loginRes.json();
  return persistServerSession(email, data, rawKeyBytes);
}

/** Login with existing credentials via web endpoint. */
export async function performLogin(
  email: string,
  password: string,
): Promise<ServerAuthResult> {
  email = email.toLowerCase().trim();
  const { auth_hash, rawKeyBytes } = await deriveKeys(password, email);

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/web/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, auth_hash }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
    throw new Error(err.error || 'Invalid credentials');
  }

  const data = await res.json();
  return persistServerSession(email, data, rawKeyBytes);
}

/** Store session data after successful auth. */
async function persistServerSession(
  email: string,
  data: { access_token: string; user_id: string },
  rawKeyBytes: ArrayBuffer,
): Promise<ServerAuthResult> {
  await storeEncryptionKeyBytes(rawKeyBytes);
  await storeAccessToken(data.access_token);
  await storeUserInfo(email, data.user_id);

  const verifier = await computeVerifier(rawKeyBytes);
  await storeVaultConfig({
    mode: 'online',
    salt: email,
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
