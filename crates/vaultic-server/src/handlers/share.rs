//! Share HTTP handlers: create, retrieve, delete.

use axum::extract::{Path, State};
use axum::Json;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::share_service;
use crate::AppState;
use vaultic_types::{CreateShareRequest, CreateShareResponse, ShareContentResponse, ShareMetaResponse};

/// POST /api/share
pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<CreateShareRequest>,
) -> Result<Json<CreateShareResponse>, AppError> {
    if req.encrypted_data.is_empty() {
        return Err(AppError::BadRequest("encrypted_data is required".into()));
    }

    let share_id = share_service::create(
        &state.db,
        auth.user_id,
        &req.encrypted_data,
        req.max_views,
        req.ttl_hours,
        req.vault_item_id,
    )
    .await?;

    Ok(Json(CreateShareResponse { share_id }))
}

/// GET /api/share/:id — public endpoint (no auth needed)
pub async fn retrieve(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
) -> Result<Json<ShareContentResponse>, AppError> {
    let encrypted_data = share_service::retrieve(&state.db, &share_id).await?;

    Ok(Json(ShareContentResponse { encrypted_data }))
}

/// GET /api/share/:id/meta — public, returns metadata without counting a view
pub async fn meta(
    State(state): State<AppState>,
    Path(share_id): Path<String>,
) -> Result<Json<ShareMetaResponse>, AppError> {
    let (max_views, current_views, expires_at) =
        share_service::get_meta(&state.db, &share_id).await?;

    Ok(Json(ShareMetaResponse {
        max_views,
        current_views,
        expires_at,
    }))
}

/// DELETE /api/share/:id — owner only
pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(share_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    share_service::delete(&state.db, &share_id, auth.user_id).await?;

    Ok(Json(serde_json::json!({ "deleted": true })))
}
