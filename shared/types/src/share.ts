// Secure share types — one-time encrypted share links

export interface CreateShareRequest {
  encrypted_data: string;
  max_views?: number;
  ttl_hours?: number;
  vault_item_id?: string;
}

export interface CreateShareResponse {
  share_id: string;
  expires_at: string | null;
}

export interface ShareContentResponse {
  encrypted_data: string;
}

export interface ShareMetaResponse {
  share_id: string;
  max_views: number | null;
  current_views: number;
  expires_at: string | null;
  created_at: string;
}
