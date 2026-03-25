// Sync types for delta push/pull

export interface SyncItem {
  id: string;
  encrypted_data: string;
  version: number;
  updated_at: string;
  deleted_at?: string;
}

export interface SyncPushRequest {
  device_id: string;
  items: SyncItem[];
}

export interface SyncPullRequest {
  device_id: string;
  last_sync_at?: string;
}

export interface SyncPullResponse {
  items: SyncItem[];
  server_time: string;
}

export interface SyncQueueEntry {
  id: string;
  item_id: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'disabled';
