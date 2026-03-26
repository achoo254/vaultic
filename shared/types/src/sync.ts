// Sync types for delta push/pull

export interface SyncItem {
  id: string;
  encrypted_data: string;
  folder_id?: string | null;
  item_type?: number;
  version: number;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SyncFolder {
  id: string;
  encrypted_name: string;
  parent_id?: string | null;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SyncPushRequest {
  device_id: string;
  items: SyncItem[];
  folders: SyncFolder[];
}

export interface SyncConflict {
  id: string;
  server_version: number;
  server_updated_at: string;
}

export interface SyncPushResponse {
  accepted_items: string[];
  accepted_folders: string[];
  conflicts: SyncConflict[];
}

export interface SyncPullResponse {
  items: SyncItem[];
  folders: SyncFolder[];
  deleted_ids: string[];
  server_time: string;
  has_more: boolean;
  next_cursor?: string;
}

export interface SyncQueueEntry {
  id: string;
  item_id: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'disabled';
