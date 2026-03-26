// Tests for AES-256-GCM encrypt/decrypt roundtrip
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../cipher';

/** Helper to create a random AES-256-GCM key */
async function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/** Helper to create a key from known raw bytes */
async function makeKeyFromRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', raw.buffer as ArrayBuffer, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'],
  );
}

describe('cipher', () => {
  it('encrypt → decrypt roundtrip returns original plaintext', async () => {
    const key = await makeKey();
    const plaintext = 'Hello, Vaultic! 🔐';
    const encrypted = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('decrypt with wrong key throws error', async () => {
    const key1 = await makeKey();
    const key2 = await makeKey();
    const encrypted = await encrypt(key1, 'secret data');
    await expect(decrypt(key2, encrypted)).rejects.toThrow();
  });

  it('encrypted output is valid base64 with nonce prefix', async () => {
    const key = await makeKey();
    const encrypted = await encrypt(key, 'test');
    // Should be valid base64
    expect(() => atob(encrypted)).not.toThrow();
    // Decoded should be at least 12 (nonce) + 16 (tag) + 4 (data) bytes
    const decoded = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    expect(decoded.length).toBeGreaterThanOrEqual(12 + 16);
  });

  it('each encryption produces different ciphertext (random nonce)', async () => {
    const key = await makeKey();
    const plaintext = 'same input';
    const enc1 = await encrypt(key, plaintext);
    const enc2 = await encrypt(key, plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it('decrypt rejects truncated ciphertext', async () => {
    const key = await makeKey();
    // Less than nonce + tag = 28 bytes → too short
    const shortData = btoa(String.fromCharCode(...new Uint8Array(20)));
    await expect(decrypt(key, shortData)).rejects.toThrow();
  });

  it('handles empty string plaintext', async () => {
    const key = await makeKey();
    const encrypted = await encrypt(key, '');
    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toBe('');
  });

  it('deterministic key produces same decryption result', async () => {
    const raw = new Uint8Array(32);
    raw.fill(42);
    const key = await makeKeyFromRaw(raw);
    const encrypted = await encrypt(key, 'deterministic');
    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toBe('deterministic');
  });
});
