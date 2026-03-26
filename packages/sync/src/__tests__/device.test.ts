// Tests for device ID generation
import { describe, it, expect } from 'vitest';
import { getDeviceId } from '../device';

describe('getDeviceId', () => {
  it('returns a non-empty string', () => {
    const id = getDeviceId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns the same ID on subsequent calls', () => {
    const id1 = getDeviceId();
    const id2 = getDeviceId();
    expect(id1).toBe(id2);
  });

  it('returns a valid UUID format', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
