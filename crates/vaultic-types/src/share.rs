//! Secure share types — encrypted one-time share links.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateShareRequest {
    /// Base64-encoded encrypted content
    pub encrypted_data: String,
    /// Max number of views (None = unlimited until expiry)
    pub max_views: Option<i32>,
    /// Expiry duration in hours
    pub expires_in_hours: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShareResponse {
    pub id: Uuid,
    pub share_url: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShareContent {
    pub encrypted_data: String,
    pub remaining_views: Option<i32>,
    pub expires_at: DateTime<Utc>,
}
