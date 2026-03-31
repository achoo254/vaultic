// Transforms between client snake_case and backend camelCase field naming
// Client VaultItem: encrypted_data, folder_id, updated_at, deleted_at
// Backend API: encryptedData, folderId, updatedAt, deletedAt

import type { VaultItem } from '@vaultic/types';

/** Client VaultItem -> backend push API format */
export function toApiItem(item: VaultItem) {
  return {
    id: item.id,
    folderId: item.folder_id || null,
    itemType: item.item_type,
    encryptedData: item.encrypted_data,
    version: item.version,
    updatedAt: item.updated_at,
    deletedAt: item.deleted_at || null,
  };
}

/** Client Folder -> backend push API format */
export function toApiFolder(f: { id: string; encrypted_name: string; parent_id?: string; updated_at: string; deleted_at?: string }) {
  return {
    id: f.id,
    encryptedName: f.encrypted_name,
    parentId: f.parent_id || null,
    updatedAt: f.updated_at,
    deletedAt: f.deleted_at || null,
  };
}

/** Backend pull response item -> client VaultItem format */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromApiItem(item: any) {
  return {
    id: item._id || item.id,
    folder_id: item.folderId,
    item_type: item.itemType ?? 1,
    encrypted_data: item.encryptedData,
    device_id: item.deviceId ?? '',
    version: item.version,
    created_at: item.createdAt || item.updatedAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? undefined,
  };
}

/** Backend pull response folder -> client Folder format */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromApiFolder(f: any) {
  return {
    id: f._id || f.id,
    encrypted_name: f.encryptedName,
    parent_id: f.parentId ?? undefined,
    updated_at: f.updatedAt,
    deleted_at: f.deletedAt ?? undefined,
  };
}
