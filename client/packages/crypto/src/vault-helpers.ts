// Vault item encrypt/decrypt helpers — wraps cipher module for vault operations

import { encrypt, decrypt } from './cipher';
import type { LoginCredential } from '@vaultic/types';

/** Encrypt a vault item's plaintext fields into a base64 ciphertext blob. */
export async function encryptVaultItem(
  key: CryptoKey,
  item: LoginCredential,
): Promise<string> {
  const json = JSON.stringify(item);
  return encrypt(key, json);
}

/** Decrypt a base64 ciphertext blob back into vault item fields. */
export async function decryptVaultItem(
  key: CryptoKey,
  encryptedData: string,
): Promise<LoginCredential> {
  const json = await decrypt(key, encryptedData);
  return JSON.parse(json);
}

/** Encrypt a folder name. */
export async function encryptFolderName(
  key: CryptoKey,
  name: string,
): Promise<string> {
  return encrypt(key, name);
}

/** Decrypt a folder name. */
export async function decryptFolderName(
  key: CryptoKey,
  encryptedName: string,
): Promise<string> {
  return decrypt(key, encryptedName);
}
