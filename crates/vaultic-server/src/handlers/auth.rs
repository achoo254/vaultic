//! Auth HTTP handlers: register, login, refresh.

use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::services::auth_service;
use crate::AppState;
use vaultic_types::{
    AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, RegisterResponse,
};

/// POST /api/auth/register
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, AppError> {
    if req.email.is_empty() || req.auth_hash.is_empty() {
        return Err(AppError::BadRequest("email and auth_hash are required".into()));
    }

    let argon2_params = req.argon2_params.map(|p| serde_json::json!({"m": p.m, "t": p.t, "p": p.p}));

    let user_id = auth_service::register(
        &state.db,
        &state.config,
        &req.email,
        &req.auth_hash,
        req.encrypted_symmetric_key.as_deref(),
        argon2_params,
    )
    .await?;

    Ok(Json(RegisterResponse { user_id }))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let (access_token, refresh_token, user_id) =
        auth_service::login(&state.db, &state.config, &req.email, &req.auth_hash).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user_id,
    }))
}

/// POST /api/auth/refresh
pub async fn refresh(
    State(state): State<AppState>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let access_token = auth_service::refresh(&state.config, &req.refresh_token).await?;

    Ok(Json(serde_json::json!({ "access_token": access_token })))
}
