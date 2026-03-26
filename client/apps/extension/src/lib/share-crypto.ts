// Share encryption: generate random key, encrypt data, build URL with key in fragment
// Key stays in URL fragment (#) — never sent to server

const NONCE_SIZE = 12;

/** Generate a share: encrypt data with random key, return encrypted blob + URL fragment. */
export async function encryptForShare(plaintext: string): Promise<{
  encryptedData: string;
  keyFragment: string;
}> {
  // Generate random 256-bit share key
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt'],
  );

  // Encrypt with AES-256-GCM
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoded);

  // Format: base64(nonce || ciphertext)
  const result = new Uint8Array(NONCE_SIZE + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), NONCE_SIZE);

  return {
    encryptedData: uint8ToBase64(result),
    keyFragment: uint8ToBase64(rawKey),
  };
}

/** Decrypt share data using key from URL fragment. */
export async function decryptShare(
  encryptedData: string,
  keyFragment: string,
): Promise<string> {
  const rawKey = base64ToUint8(keyFragment);
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt'],
  );

  const data = base64ToUint8(encryptedData);
  const nonce = data.slice(0, NONCE_SIZE);
  const ciphertext = data.slice(NONCE_SIZE);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
