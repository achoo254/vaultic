// Device ID generation and persistence

// In-memory fallback when localStorage is unavailable (e.g. service worker)
let memoryDeviceId: string | null = null;

/** Get or create a unique device ID for this browser/device */
export function getDeviceId(): string {
  const key = 'vaultic_device_id';

  // Try localStorage first (popup, content script)
  try {
    const stored = globalThis.localStorage?.getItem(key);
    if (stored) return stored;
  } catch {
    // localStorage unavailable (service worker, SSR)
  }

  // Return cached in-memory ID if already generated this session
  if (memoryDeviceId) return memoryDeviceId;

  // Generate new ID
  const id = crypto.randomUUID();
  memoryDeviceId = id;

  // Persist if possible
  try {
    globalThis.localStorage?.setItem(key, id);
  } catch {
    // Silently fail — ID is still usable from memory
  }

  return id;
}
