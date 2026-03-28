// Share encryption: generate random key, encrypt data, build URL with key in fragment
// Key stays in URL fragment (#) — never sent to server

import {
  encodeShareFragment,
  decodeShareFragment,
  toBase64Url,
  fromBase64Url,
} from '@vaultic/crypto';

const NONCE_SIZE = 12;

// --- New: URL-based share (hybrid model — data in URL, metadata on server) ---

/** Encrypt plaintext and encode into URL fragment: v1.{iv}.{ciphertext}.{key} */
export async function encryptShareToUrl(plaintext: string): Promise<{
  fragment: string;
  shareId: string;
}> {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const fragment = encodeShareFragment(iv, new Uint8Array(ciphertextBuf as ArrayBuffer), rawKey);
  const shareId = generateShareId();

  return { fragment, shareId };
}

/** Decrypt data from URL fragment (v1.{iv}.{ciphertext}.{key}). */
export async function decryptShareFromUrl(fragment: string): Promise<string> {
  const { iv, ciphertext, key: rawKey } = decodeShareFragment(fragment);

  const key = await crypto.subtle.importKey(
    'raw' as any, rawKey as any, { name: 'AES-GCM' }, false, ['decrypt'] as any,
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv } as any,
    key,
    ciphertext as any,
  );
  return new TextDecoder().decode(plaintext);
}

// --- Legacy: server-stored encrypted data (backward compat) ---

/** Generate a share: encrypt data with random key, return encrypted blob + URL fragment. */
export async function encryptForShare(plaintext: string): Promise<{
  encryptedData: string;
  keyFragment: string;
}> {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt'],
  );

  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoded);

  const result = new Uint8Array(NONCE_SIZE + ciphertextBuf.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertextBuf), NONCE_SIZE);

  return {
    encryptedData: uint8ToBase64(result),
    keyFragment: uint8ToBase64(rawKey),
  };
}

/** Decrypt share data using key from URL fragment (legacy). */
export async function decryptShare(
  encryptedData: string,
  keyFragment: string,
): Promise<string> {
  const rawKey = base64ToUint8(keyFragment);
  const key = await crypto.subtle.importKey(
    'raw' as any, rawKey as any, { name: 'AES-GCM' }, false, ['decrypt'] as any,
  );

  const data = base64ToUint8(encryptedData);
  const nonce = data.slice(0, NONCE_SIZE);
  const ciphertext = data.slice(NONCE_SIZE);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce } as any,
    key,
    ciphertext as any,
  );
  return new TextDecoder().decode(plaintext);
}

// --- Helpers ---

function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
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
