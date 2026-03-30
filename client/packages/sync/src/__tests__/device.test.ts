// Tests for device ID generation (async, chrome.storage.local with fallbacks)
import { describe, it, expect } from 'vitest';
import { getDeviceId } from '../device';

describe('getDeviceId', () => {
  it('returns a non-empty string', async () => {
    const id = await getDeviceId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns the same ID on subsequent calls', async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();
    expect(id1).toBe(id2);
  });

  it('returns a valid UUID format', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
