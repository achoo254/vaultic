// AES-256-GCM encryption/decryption using WebCrypto API

/** Encrypt plaintext with AES-256-GCM. Returns base64(iv + ciphertext). */
export async function encrypt(
  _key: CryptoKey,
  _plaintext: string,
): Promise<string> {
  // Implementation in Phase 4
  throw new Error('Not implemented: Phase 4');
}

/** Decrypt base64(iv + ciphertext) with AES-256-GCM. */
export async function decrypt(
  _key: CryptoKey,
  _encryptedData: string,
): Promise<string> {
  // Implementation in Phase 4
  throw new Error('Not implemented: Phase 4');
}
