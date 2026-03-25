// Device ID generation and persistence

/** Get or create a unique device ID for this browser/device */
export function getDeviceId(): string {
  const key = 'vaultic_device_id';
  let id = globalThis.localStorage?.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    globalThis.localStorage?.setItem(key, id);
  }
  return id;
}
