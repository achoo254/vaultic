// Sync API — push/pull encrypted vault deltas

import type { $Fetch } from 'ofetch';
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
} from '@vaultic/types';

/** Sync API client for delta push/pull */
export class SyncApi {
  constructor(private client: $Fetch) {}

  async push(data: SyncPushRequest): Promise<SyncPushResponse> {
    return this.client('/api/v1/sync/push', { method: 'POST', body: data });
  }

  async pull(params: {
    deviceId: string;
    since?: string;
    limit?: number;
    cursor?: string;
  }): Promise<SyncPullResponse> {
    const query = new URLSearchParams();
    query.set('deviceId', params.deviceId);
    if (params.since) query.set('since', params.since);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    return this.client(`/api/v1/sync/pull?${query}`);
  }

  async purge(): Promise<void> {
    await this.client('/api/v1/sync/data', { method: 'DELETE' });
  }

  async pushPreferences(prefs: { language: string; theme: string; updatedAt: number }): Promise<void> {
    await this.client('/api/v1/sync/preferences', { method: 'PUT', body: prefs });
  }

  async pullPreferences(): Promise<{ language: string; theme: string; updatedAt: number } | null> {
    const res = await this.client<{ preferences: { language: string; theme: string; updatedAt: number } | null }>('/api/v1/sync/preferences');
    return res.preferences;
  }
}
