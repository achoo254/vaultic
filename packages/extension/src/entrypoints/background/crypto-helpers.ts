// Shared crypto utilities for background service worker

/** Get encryption key from session storage. */
export async function getEncKey(): Promise<CryptoKey | null> {
  const result = await chrome.storage.session.get('enc_key');
  if (!result.enc_key) return null;
  return crypto.subtle.importKey(
    'raw', new Uint8Array(result.enc_key),
    { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'],
  );
}

/** Extract base domain from a URL string. */
export function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}
