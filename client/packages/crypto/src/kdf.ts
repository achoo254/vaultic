// Key derivation: Argon2id for master key, HKDF for sub-keys (WebCrypto)
// Must produce identical output to Rust vaultic-crypto crate

import { argon2id } from 'hash-wasm';
import type { DerivedKeys } from '@vaultic/types';

// Match Rust constants exactly
const ARGON2_M_COST = 65536; // 64MB in KiB
const ARGON2_T_COST = 3;
const ARGON2_P_COST = 4;
const KEY_LENGTH = 32;
const HKDF_INFO_ENC = new TextEncoder().encode('vaultic-enc');
const HKDF_INFO_AUTH = new TextEncoder().encode('vaultic-auth');

/** Derive 256-bit master key from password + email using Argon2id.
 *  Returns raw bytes as ArrayBuffer (not a CryptoKey — needed for HKDF import). */
export async function deriveMasterKey(
  password: string,
  email: string,
): Promise<ArrayBuffer> {
  const hashHex = await argon2id({
    password,
    salt: email,
    memorySize: ARGON2_M_COST,
    iterations: ARGON2_T_COST,
    parallelism: ARGON2_P_COST,
    hashLength: KEY_LENGTH,
    outputType: 'hex',
  });
  return hexToBuffer(hashHex);
}

/** Derive AES-256-GCM encryption key from master key using HKDF-SHA256.
 *  Info string: "vaultic-enc" for domain separation.
 *  Returns non-extractable CryptoKey — safe for chrome.storage.session via bytes. */
export async function deriveEncryptionKey(
  masterKey: ArrayBuffer,
): Promise<CryptoKey> {
  const { key } = await deriveEncryptionKeyWithBytes(masterKey);
  return key;
}

/** Derive AES-256-GCM encryption key + raw bytes in one pass.
 *  Uses deriveBits to get the 256-bit raw material, then imports as non-extractable CryptoKey.
 *  rawBytes is used for: verifier computation, chrome.storage.session persistence. */
export async function deriveEncryptionKeyWithBytes(
  masterKey: ArrayBuffer,
): Promise<{ key: CryptoKey; rawBytes: ArrayBuffer }> {
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
    'HKDF',
    false,
    ['deriveBits'],
  );
  const rawBytes = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: HKDF_INFO_ENC,
    },
    hkdfKey,
    256,
  );
  const key = await crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    false, // non-extractable — security hardening (ADV-07)
    ['encrypt', 'decrypt'],
  );
  return { key, rawBytes };
}

/** Derive auth hash from master key for server authentication.
 *  Uses HKDF with "vaultic-auth" info, then SHA-256. Returns hex string. */
export async function deriveAuthHash(
  masterKey: ArrayBuffer,
): Promise<string> {
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
    'HKDF',
    false,
    ['deriveBits'],
  );
  const authKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: HKDF_INFO_AUTH,
    },
    hkdfKey,
    256,
  );

  // Hash once more with SHA-256 (same as Rust: Sha256::digest(auth_key))
  const hash = await crypto.subtle.digest('SHA-256', authKeyBits);
  return bufferToHex(hash);
}

/** Derive master key from password + raw salt bytes (for offline mode). */
export async function deriveMasterKeyWithSalt(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const hashHex = await argon2id({
    password,
    salt,
    memorySize: ARGON2_M_COST,
    iterations: ARGON2_T_COST,
    parallelism: ARGON2_P_COST,
    hashLength: KEY_LENGTH,
    outputType: 'hex',
  });
  return hexToBuffer(hashHex);
}

/** Derive all keys from password + email in one call.
 *  Returns encryption_key (non-extractable), auth_hash, and rawKeyBytes for session storage. */
export async function deriveKeys(
  password: string,
  email: string,
): Promise<DerivedKeys & { rawKeyBytes: ArrayBuffer }> {
  const masterKey = await deriveMasterKey(password, email);
  const [{ key: encryption_key, rawBytes: rawKeyBytes }, auth_hash] = await Promise.all([
    deriveEncryptionKeyWithBytes(masterKey),
    deriveAuthHash(masterKey),
  ]);
  return { encryption_key, auth_hash, rawKeyBytes };
}

/** Convert ArrayBuffer to hex string. */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert hex string to ArrayBuffer. */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}
