// Sync API — push/pull encrypted vault deltas

import type { $Fetch } from 'ofetch';
import type {
  SyncPushRequest,
  SyncPullRequest,
  SyncPullResponse,
} from '@vaultic/types';

/** Sync API client for delta push/pull */
export class SyncApi {
  constructor(private client: $Fetch) {}

  async push(data: SyncPushRequest): Promise<void> {
    await this.client('/api/sync/push', { method: 'POST', body: data });
  }

  async pull(data: SyncPullRequest): Promise<SyncPullResponse> {
    return this.client('/api/sync/pull', { method: 'POST', body: data });
  }
}
