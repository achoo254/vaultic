// Device ID generation and persistence
// Prefers chrome.storage.local (works in popup + service worker),
// falls back to localStorage, then in-memory

let cachedId: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeApi = typeof globalThis !== 'undefined' ? (globalThis as any).chrome : undefined;

/** Get or create a unique device ID for this browser/device. */
export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  // Try chrome.storage.local (available in both popup and SW)
  if (chromeApi?.storage?.local) {
    try {
      const result = await chromeApi.storage.local.get('vaultic_device_id');
      if (result.vaultic_device_id) {
        cachedId = result.vaultic_device_id;
        return cachedId!;
      }
    } catch {
      // chrome.storage unavailable
    }
  }

  // Fallback: try localStorage (content script, non-extension context)
  try {
    const stored = globalThis.localStorage?.getItem('vaultic_device_id');
    if (stored) {
      cachedId = stored;
      return cachedId!;
    }
  } catch {
    // localStorage unavailable
  }

  // Generate new ID and persist
  const id = crypto.randomUUID();
  cachedId = id;

  if (chromeApi?.storage?.local) {
    try { await chromeApi.storage.local.set({ vaultic_device_id: id }); } catch { /* noop */ }
  } else {
    try { globalThis.localStorage?.setItem('vaultic_device_id', id); } catch { /* noop */ }
  }

  return id;
}
