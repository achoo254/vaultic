//! Sync-related types for delta push/pull.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPushRequest {
    pub device_id: String,
    pub items: Vec<SyncItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPullRequest {
    pub device_id: String,
    pub last_sync_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncItem {
    pub id: Uuid,
    pub encrypted_data: String,
    pub version: i32,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPullResponse {
    pub items: Vec<SyncItem>,
    pub server_time: DateTime<Utc>,
}
