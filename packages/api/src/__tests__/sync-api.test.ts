// Tests for SyncApi — verifies correct HTTP methods and paths
import { describe, it, expect, vi } from 'vitest';
import type { $Fetch } from 'ofetch';
import { SyncApi } from '../sync-api';

function mockClient() {
  return vi.fn().mockResolvedValue({ items: [], server_time: '2026-01-01T00:00:00Z' }) as unknown as $Fetch & ReturnType<typeof vi.fn>;
}

describe('SyncApi', () => {
  it('push sends POST to /api/sync/push', async () => {
    const client = mockClient();
    const api = new SyncApi(client);
    await api.push({ device_id: 'dev-1', items: [] });
    expect(client).toHaveBeenCalledWith('/api/sync/push', {
      method: 'POST',
      body: { device_id: 'dev-1', items: [] },
    });
  });

  it('pull sends POST to /api/sync/pull', async () => {
    const client = mockClient();
    const api = new SyncApi(client);
    await api.pull({ device_id: 'dev-1' });
    expect(client).toHaveBeenCalledWith('/api/sync/pull', {
      method: 'POST',
      body: { device_id: 'dev-1' },
    });
  });

  it('purge sends DELETE to /api/sync/purge', async () => {
    const client = mockClient();
    const api = new SyncApi(client);
    await api.purge();
    expect(client).toHaveBeenCalledWith('/api/sync/purge', {
      method: 'DELETE',
    });
  });
});
