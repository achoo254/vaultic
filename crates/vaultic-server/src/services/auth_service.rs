//! Authentication service: register, login, JWT token generation.

use chrono::Utc;
use hmac::{Hmac, Mac};
use jsonwebtoken::{encode, EncodingKey, Header};
use sea_orm::*;
use sha2::Sha256;
use uuid::Uuid;

use crate::config::AppConfig;
use crate::entities::user;
use crate::error::AppError;
use crate::middleware::auth::Claims;

type HmacSha256 = Hmac<Sha256>;

/// Compute HMAC-SHA256(auth_hash, server_secret) for server-side storage.
/// This prevents rainbow table attacks even if the DB is leaked.
fn hash_for_storage(auth_hash: &str, server_secret: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(server_secret.as_bytes())
        .expect("HMAC accepts any key length");
    mac.update(auth_hash.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Register a new user. Stores HMAC(auth_hash, server_secret).
pub async fn register(
    db: &DatabaseConnection,
    config: &AppConfig,
    email: &str,
    auth_hash: &str,
    encrypted_symmetric_key: Option<&str>,
    argon2_params: Option<serde_json::Value>,
) -> Result<Uuid, AppError> {
    // Check for existing user
    let existing = user::Entity::find()
        .filter(user::Column::Email.eq(email))
        .one(db)
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("email already registered".into()));
    }

    let server_hash = hash_for_storage(auth_hash, &config.jwt_secret);

    let user_id = Uuid::new_v4();
    let params = argon2_params.unwrap_or(serde_json::json!({"m": 65536, "t": 3, "p": 4}));

    let new_user = user::ActiveModel {
        id: Set(user_id),
        email: Set(email.to_string()),
        auth_hash: Set(server_hash),
        encrypted_symmetric_key: Set(encrypted_symmetric_key.map(|s| s.to_string())),
        argon2_params: Set(params),
        created_at: Set(Some(Utc::now().into())),
        updated_at: Set(Some(Utc::now().into())),
    };

    user::Entity::insert(new_user).exec(db).await?;

    Ok(user_id)
}

/// Verify auth_hash and return JWT tokens.
pub async fn login(
    db: &DatabaseConnection,
    config: &AppConfig,
    email: &str,
    auth_hash: &str,
) -> Result<(String, String, Uuid), AppError> {
    let user = user::Entity::find()
        .filter(user::Column::Email.eq(email))
        .one(db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("invalid credentials".into()))?;

    // Constant-time comparison via HMAC verify
    let provided_hash = hash_for_storage(auth_hash, &config.jwt_secret);
    if provided_hash != user.auth_hash {
        return Err(AppError::Unauthorized("invalid credentials".into()));
    }

    let access_token = create_token(&user.id, "access", config.access_token_ttl_min * 60, config)?;
    let refresh_token = create_token(&user.id, "refresh", config.refresh_token_ttl_days * 86400, config)?;

    Ok((access_token, refresh_token, user.id))
}

/// Validate refresh token and issue a new access token.
pub async fn refresh(
    config: &AppConfig,
    refresh_token: &str,
) -> Result<String, AppError> {
    let token_data = jsonwebtoken::decode::<Claims>(
        refresh_token,
        &jsonwebtoken::DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|e| AppError::Unauthorized(format!("invalid refresh token: {e}")))?;

    if token_data.claims.token_type != "refresh" {
        return Err(AppError::Unauthorized("expected refresh token".into()));
    }

    let access_token = create_token(
        &token_data.claims.sub,
        "access",
        config.access_token_ttl_min * 60,
        config,
    )?;

    Ok(access_token)
}

/// Create a signed JWT token.
fn create_token(
    user_id: &Uuid,
    token_type: &str,
    ttl_seconds: u64,
    config: &AppConfig,
) -> Result<String, AppError> {
    let now = Utc::now().timestamp() as u64;
    let claims = Claims {
        sub: *user_id,
        iat: now,
        exp: now + ttl_seconds,
        token_type: token_type.to_string(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("token creation failed: {e}")))
}
