// Encoding utilities: Base64 ↔ Uint8Array conversion + key verifier
// Used in auth-store and share-crypto — single source of truth

/** Encode Uint8Array to Base64 string. */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Decode Base64 string to Uint8Array. */
export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Compute SHA-256 hex digest of raw key bytes — used as vault verifier. */
export async function computeVerifier(rawKeyBuffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', rawKeyBuffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
