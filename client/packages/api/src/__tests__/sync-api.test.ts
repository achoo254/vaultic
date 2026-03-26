// Tests for SyncApi — verifies correct HTTP methods and paths
import { describe, it, expect, vi } from 'vitest';
import type { $Fetch } from 'ofetch';
import { SyncApi } from '../sync-api';

function mockClient() {
  return vi.fn().mockResolvedValue({ items: [], folders: [], server_time: '2026-01-01T00:00:00Z' }) as unknown as $Fetch & ReturnType<typeof vi.fn>;
}

describe('SyncApi', () => {
  it('push sends POST to /api/v1/sync/push', async () => {
    const client = mockClient();
    const api = new SyncApi(client);
    await api.push({ device_id: 'dev-1', items: [], folders: [] });
    expect(client).toHaveBeenCalledWith('/api/v1/sync/push', {
      method: 'POST',
      body: { device_id: 'dev-1', items: [], folders: [] },
    });
  });

  it('pull sends GET to /api/v1/sync/pull', async () => {
    const client = mockClient();
    const api = new SyncApi(client);
    await api.pull({ deviceId: 'dev-1' });
    expect(client).toHaveBeenCalledWith(expect.stringContaining('/api/v1/sync/pull?'));
  });

  it('purge sends DELETE to /api/v1/sync/data', async () => {
    const client = mockClient();
    const api = new SyncApi(client);
    await api.purge();
    expect(client).toHaveBeenCalledWith('/api/v1/sync/data', {
      method: 'DELETE',
    });
  });
});
