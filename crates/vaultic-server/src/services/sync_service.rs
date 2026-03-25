//! Sync relay service: accept encrypted push, serve delta pull, purge.

use chrono::{DateTime, Utc};
use sea_orm::*;
use uuid::Uuid;

use crate::entities::{folder, vault_item};
use crate::error::AppError;
use vaultic_types::{SyncConflict, SyncFolder, SyncItem, SyncPushResponse, SyncPullResponse};

/// Process a batch push of encrypted items and folders from a client device.
/// Uses LWW (last-write-wins) conflict resolution by `updated_at`.
pub async fn push(
    db: &DatabaseConnection,
    user_id: Uuid,
    device_id: &str,
    items: Vec<SyncItem>,
    folders: Vec<SyncFolder>,
) -> Result<SyncPushResponse, AppError> {
    let mut accepted_items = Vec::new();
    let mut accepted_folders = Vec::new();
    let mut conflicts = Vec::new();

    // Process folders
    for f in folders {
        let existing = folder::Entity::find_by_id(f.id).one(db).await?;

        match existing {
            Some(existing) if existing.user_id == user_id => {
                let server_updated = existing.updated_at.map(|t| t.into()).unwrap_or(DateTime::<Utc>::MIN_UTC);
                if f.updated_at > server_updated {
                    // Client wins — update server copy
                    let mut model: folder::ActiveModel = existing.into();
                    model.encrypted_name = Set(f.encrypted_name);
                    model.parent_id = Set(f.parent_id);
                    model.updated_at = Set(Some(f.updated_at.into()));
                    model.deleted_at = Set(f.deleted_at.map(|t| t.into()));
                    model.update(db).await?;
                    accepted_folders.push(f.id);
                }
                // If server is newer, silently skip (client will get server version on pull)
            }
            Some(_) => {
                // Belongs to another user — silently ignore
            }
            None => {
                // New folder — insert
                let new_folder = folder::ActiveModel {
                    id: Set(f.id),
                    user_id: Set(user_id),
                    encrypted_name: Set(f.encrypted_name),
                    parent_id: Set(f.parent_id),
                    created_at: Set(Some(Utc::now().into())),
                    updated_at: Set(Some(f.updated_at.into())),
                    deleted_at: Set(f.deleted_at.map(|t| t.into())),
                };
                folder::Entity::insert(new_folder).exec(db).await?;
                accepted_folders.push(f.id);
            }
        }
    }

    // Process vault items
    for item in items {
        let existing = vault_item::Entity::find_by_id(item.id).one(db).await?;

        match existing {
            Some(existing) if existing.user_id == user_id => {
                let server_updated = existing.updated_at.map(|t| t.into()).unwrap_or(DateTime::<Utc>::MIN_UTC);
                if item.updated_at > server_updated {
                    // Client wins (LWW)
                    let mut model: vault_item::ActiveModel = existing.into();
                    model.encrypted_data = Set(item.encrypted_data);
                    model.folder_id = Set(item.folder_id);
                    model.version = Set(item.version);
                    model.device_id = Set(device_id.to_string());
                    model.updated_at = Set(Some(item.updated_at.into()));
                    model.deleted_at = Set(item.deleted_at.map(|t| t.into()));
                    model.update(db).await?;
                    accepted_items.push(item.id);
                } else {
                    // Server wins — report conflict to client
                    conflicts.push(SyncConflict {
                        id: item.id,
                        server_version: existing.version,
                        server_updated_at: server_updated,
                    });
                }
            }
            Some(_) => {
                // Belongs to another user — silently ignore
            }
            None => {
                // New item — insert
                let new_item = vault_item::ActiveModel {
                    id: Set(item.id),
                    user_id: Set(user_id),
                    folder_id: Set(item.folder_id),
                    item_type: Set(item.item_type.unwrap_or(1)),
                    encrypted_data: Set(item.encrypted_data),
                    device_id: Set(device_id.to_string()),
                    version: Set(item.version),
                    created_at: Set(Some(Utc::now().into())),
                    updated_at: Set(Some(item.updated_at.into())),
                    deleted_at: Set(item.deleted_at.map(|t| t.into())),
                };
                vault_item::Entity::insert(new_item).exec(db).await?;
                accepted_items.push(item.id);
            }
        }
    }

    Ok(SyncPushResponse {
        accepted_items,
        accepted_folders,
        conflicts,
    })
}

/// Pull changes since a given timestamp, excluding the requesting device's own changes.
pub async fn pull(
    db: &DatabaseConnection,
    user_id: Uuid,
    since: Option<DateTime<Utc>>,
    device_id: &str,
) -> Result<SyncPullResponse, AppError> {
    let server_time = Utc::now();

    // Pull vault items updated since last sync, excluding sender's device
    let mut item_query = vault_item::Entity::find()
        .filter(vault_item::Column::UserId.eq(user_id))
        .filter(vault_item::Column::DeviceId.ne(device_id));

    if let Some(since) = since {
        item_query = item_query.filter(vault_item::Column::UpdatedAt.gt(since));
    }

    let items: Vec<vault_item::Model> = item_query.all(db).await?;

    // Pull folders
    let mut folder_query = folder::Entity::find()
        .filter(folder::Column::UserId.eq(user_id));

    if let Some(since) = since {
        folder_query = folder_query.filter(folder::Column::UpdatedAt.gt(since));
    }

    let folders: Vec<folder::Model> = folder_query.all(db).await?;

    // Collect deleted IDs
    let deleted_ids: Vec<Uuid> = items
        .iter()
        .filter(|i| i.deleted_at.is_some())
        .map(|i| i.id)
        .chain(folders.iter().filter(|f| f.deleted_at.is_some()).map(|f| f.id))
        .collect();

    // Convert to sync types
    let sync_items: Vec<SyncItem> = items
        .into_iter()
        .map(|i| SyncItem {
            id: i.id,
            folder_id: i.folder_id,
            item_type: Some(i.item_type),
            encrypted_data: i.encrypted_data,
            version: i.version,
            updated_at: i.updated_at.map(|t| t.into()).unwrap_or(server_time),
            deleted_at: i.deleted_at.map(|t| t.into()),
        })
        .collect();

    let sync_folders: Vec<SyncFolder> = folders
        .into_iter()
        .map(|f| SyncFolder {
            id: f.id,
            encrypted_name: f.encrypted_name,
            parent_id: f.parent_id,
            updated_at: f.updated_at.map(|t| t.into()).unwrap_or(server_time),
            deleted_at: f.deleted_at.map(|t| t.into()),
        })
        .collect();

    Ok(SyncPullResponse {
        items: sync_items,
        folders: sync_folders,
        deleted_ids,
        server_time,
    })
}

/// Delete all user's vault data from server (when user disables sync).
pub async fn purge(db: &DatabaseConnection, user_id: Uuid) -> Result<u64, AppError> {
    let item_result = vault_item::Entity::delete_many()
        .filter(vault_item::Column::UserId.eq(user_id))
        .exec(db)
        .await?;

    let folder_result = folder::Entity::delete_many()
        .filter(folder::Column::UserId.eq(user_id))
        .exec(db)
        .await?;

    Ok(item_result.rows_affected + folder_result.rows_affected)
}
