//! Sync-related types for delta push/pull.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPushRequest {
    pub device_id: String,
    pub items: Vec<SyncItem>,
    pub folders: Vec<SyncFolder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncItem {
    pub id: Uuid,
    pub folder_id: Option<Uuid>,
    pub item_type: Option<i16>,
    pub encrypted_data: String,
    pub version: i32,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncFolder {
    pub id: Uuid,
    pub encrypted_name: String,
    pub parent_id: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPushResponse {
    pub accepted_items: Vec<Uuid>,
    pub accepted_folders: Vec<Uuid>,
    pub conflicts: Vec<SyncConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub id: Uuid,
    pub server_version: i32,
    pub server_updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPullResponse {
    pub items: Vec<SyncItem>,
    pub folders: Vec<SyncFolder>,
    pub deleted_ids: Vec<Uuid>,
    pub server_time: DateTime<Utc>,
}
