// Key derivation: Argon2id for master key, HKDF for sub-keys (WebCrypto)

import type { DerivedKeys } from '@vaultic/types';

/** Derive master key from password + email salt using Argon2id */
export async function deriveMasterKey(
  _password: string,
  _email: string,
): Promise<CryptoKey> {
  // Implementation in Phase 4
  throw new Error('Not implemented: Phase 4');
}

/** Derive encryption key from master key using HKDF */
export async function deriveEncryptionKey(
  _masterKey: CryptoKey,
): Promise<CryptoKey> {
  // Implementation in Phase 4
  throw new Error('Not implemented: Phase 4');
}

/** Derive auth hash from master key for server authentication */
export async function deriveAuthHash(
  _masterKey: CryptoKey,
): Promise<string> {
  // Implementation in Phase 4
  throw new Error('Not implemented: Phase 4');
}

/** Derive all keys from password + email */
export async function deriveKeys(
  _password: string,
  _email: string,
): Promise<DerivedKeys> {
  // Implementation in Phase 4
  throw new Error('Not implemented: Phase 4');
}
