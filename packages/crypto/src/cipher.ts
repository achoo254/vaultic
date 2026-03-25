// AES-256-GCM encryption/decryption using WebCrypto API
// Format: nonce (12 bytes) || ciphertext || auth tag (16 bytes)
// Must match Rust vaultic-crypto cipher.rs output exactly

const NONCE_SIZE = 12;

/** Encrypt plaintext string with AES-256-GCM.
 *  Returns base64(nonce || ciphertext || tag). */
export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(plaintext);
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encoded,
  );

  // Prepend nonce to ciphertext (same format as Rust)
  const result = new Uint8Array(NONCE_SIZE + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), NONCE_SIZE);

  return uint8ToBase64(result);
}

/** Decrypt base64(nonce || ciphertext || tag) with AES-256-GCM. */
export async function decrypt(
  key: CryptoKey,
  encryptedData: string,
): Promise<string> {
  const data = base64ToUint8(encryptedData);

  if (data.length < NONCE_SIZE + 16) {
    throw new Error('Ciphertext too short');
  }

  const nonce = data.slice(0, NONCE_SIZE);
  const ciphertext = data.slice(NONCE_SIZE);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

/** Encrypt raw bytes (for vault items that are already encoded). */
export async function encryptBytes(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    data,
  );
  const result = new Uint8Array(NONCE_SIZE + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), NONCE_SIZE);
  return result;
}

/** Decrypt raw bytes. */
export async function decryptBytes(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<Uint8Array> {
  const arr = new Uint8Array(data);
  const nonce = arr.slice(0, NONCE_SIZE);
  const ciphertext = arr.slice(NONCE_SIZE);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
