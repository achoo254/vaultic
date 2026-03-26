// Tests for LWW conflict resolver
import { describe, it, expect } from 'vitest';
import { LWWResolver } from '../conflict-resolver';
import type { SyncItem } from '@vaultic/types';

function makeItem(overrides: Partial<SyncItem> = {}): SyncItem {
  return {
    id: 'item-1',
    encrypted_data: 'encrypted',
    version: 1,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('LWWResolver', () => {
  const resolver = new LWWResolver();

  it('newer timestamp wins — remote is newer', () => {
    const local = makeItem({ updated_at: '2026-01-01T00:00:00Z', encrypted_data: 'local' });
    const remote = makeItem({ updated_at: '2026-01-02T00:00:00Z', encrypted_data: 'remote' });
    expect(resolver.resolve(local, remote)).toBe(remote);
  });

  it('newer timestamp wins — local is newer', () => {
    const local = makeItem({ updated_at: '2026-01-02T00:00:00Z', encrypted_data: 'local' });
    const remote = makeItem({ updated_at: '2026-01-01T00:00:00Z', encrypted_data: 'remote' });
    expect(resolver.resolve(local, remote)).toBe(local);
  });

  it('equal timestamps — local wins (not strictly greater)', () => {
    const local = makeItem({ updated_at: '2026-01-01T12:00:00Z', encrypted_data: 'local' });
    const remote = makeItem({ updated_at: '2026-01-01T12:00:00Z', encrypted_data: 'remote' });
    // remote.updated_at > local.updated_at is false → returns local
    expect(resolver.resolve(local, remote)).toBe(local);
  });

  it('handles deleted items with timestamps', () => {
    const local = makeItem({ updated_at: '2026-01-01T00:00:00Z' });
    const remote = makeItem({ updated_at: '2026-01-03T00:00:00Z', deleted_at: '2026-01-03T00:00:00Z' });
    expect(resolver.resolve(local, remote)).toBe(remote);
  });
});
