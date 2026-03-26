// Share API — create, retrieve, meta, delete encrypted share links

import type { $Fetch } from 'ofetch';
import type {
  CreateShareRequest,
  CreateShareResponse,
  ShareContentResponse,
  ShareMetaResponse,
} from '@vaultic/types';

/** Share API client for encrypted share links */
export class ShareApi {
  constructor(private client: $Fetch) {}

  async create(data: CreateShareRequest): Promise<CreateShareResponse> {
    return this.client('/api/v1/shares', { method: 'POST', body: data });
  }

  async get(shareId: string): Promise<ShareContentResponse> {
    return this.client(`/api/v1/shares/${shareId}`);
  }

  async meta(shareId: string): Promise<ShareMetaResponse> {
    return this.client(`/api/v1/shares/${shareId}/meta`);
  }

  async delete(shareId: string): Promise<void> {
    await this.client(`/api/v1/shares/${shareId}`, { method: 'DELETE' });
  }
}
