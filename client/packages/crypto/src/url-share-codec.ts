// URL-safe base64url encode/decode for embedding encrypted share data in URL fragments
// Format: v1.{iv}.{ciphertext}.{key} — all base64url encoded

const MAX_FRAGMENT_LENGTH = 2000;

/** Encode bytes to base64url (no padding, URL-safe). */
export function toBase64Url(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode base64url string back to bytes. */
export function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode share components into URL fragment: v1.{iv}.{ciphertext}.{key} */
export function encodeShareFragment(
  iv: Uint8Array,
  ciphertext: Uint8Array,
  key: Uint8Array,
): string {
  return `v1.${toBase64Url(iv)}.${toBase64Url(ciphertext)}.${toBase64Url(key)}`;
}

/** Decode URL fragment back to components. */
export function decodeShareFragment(fragment: string): {
  version: string;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  key: Uint8Array;
} {
  const parts = fragment.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid share fragment format');
  }
  return {
    version: parts[0],
    iv: fromBase64Url(parts[1]),
    ciphertext: fromBase64Url(parts[2]),
    key: fromBase64Url(parts[3]),
  };
}

/** Estimate if plaintext + encryption overhead will fit in URL fragment limit. */
export function estimateFragmentSize(plaintextBytes: number): number {
  // AES-GCM adds 16-byte auth tag, 12-byte IV, 32-byte key
  // base64url expands by ~4/3, plus "v1." prefix and 3 dots
  const rawBytes = 12 + plaintextBytes + 16 + 32;
  return Math.ceil(rawBytes * 4 / 3) + 4; // +4 for "v1." and dots
}

/** Check if plaintext will fit within URL fragment limit. */
export function isWithinUrlLimit(plaintext: string): boolean {
  const bytes = new TextEncoder().encode(plaintext).length;
  return estimateFragmentSize(bytes) <= MAX_FRAGMENT_LENGTH;
}

export { MAX_FRAGMENT_LENGTH };
