// Share API — create and retrieve encrypted share links

import type { $Fetch } from 'ofetch';
import type {
  CreateShareRequest,
  ShareResponse,
  ShareContent,
} from '@vaultic/types';

/** Share API client for creating/retrieving encrypted share links */
export class ShareApi {
  constructor(private client: $Fetch) {}

  async create(data: CreateShareRequest): Promise<ShareResponse> {
    return this.client('/api/share', { method: 'POST', body: data });
  }

  async get(shareId: string): Promise<ShareContent> {
    return this.client(`/api/share/${shareId}`);
  }
}
