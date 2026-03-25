// Secure share types — one-time encrypted share links

export interface CreateShareRequest {
  /** Base64-encoded encrypted content */
  encrypted_data: string;
  /** Max number of views (undefined = unlimited until expiry) */
  max_views?: number;
  /** Expiry duration in hours */
  expires_in_hours: number;
}

export interface ShareResponse {
  id: string;
  share_url: string;
  expires_at: string;
}

export interface ShareContent {
  encrypted_data: string;
  remaining_views?: number;
  expires_at: string;
}
