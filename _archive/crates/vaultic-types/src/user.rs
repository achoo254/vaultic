//! User and authentication types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub auth_hash: String,
    pub encrypted_symmetric_key: Option<String>,
    pub argon2_params: Argon2Params,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Argon2Params {
    pub m: u32,
    pub t: u32,
    pub p: u32,
}

impl Default for Argon2Params {
    fn default() -> Self {
        Self { m: 65536, t: 3, p: 4 }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub auth_hash: String,
    pub encrypted_symmetric_key: Option<String>,
    pub argon2_params: Option<Argon2Params>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub auth_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user_id: Uuid,
}
