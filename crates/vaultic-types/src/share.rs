//! Secure share types — encrypted one-time share links.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateShareRequest {
    /// Base64-encoded encrypted content
    pub encrypted_data: String,
    /// Max number of views (None = unlimited until expiry)
    pub max_views: Option<i32>,
    /// Expiry duration in hours
    pub ttl_hours: Option<i32>,
    /// Optional link to vault item (requires sync enabled)
    pub vault_item_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateShareResponse {
    pub share_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShareContentResponse {
    pub encrypted_data: String,
}

/// Metadata response for share link — returned WITHOUT counting a view.
#[derive(Debug, Serialize, Deserialize)]
pub struct ShareMetaResponse {
    pub max_views: Option<i32>,
    pub current_views: i32,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}
