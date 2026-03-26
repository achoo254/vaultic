//! Sync HTTP handlers: push, pull, purge.

use axum::extract::{Query, State};
use axum::Json;
use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::sync_service;
use crate::AppState;
use vaultic_types::{SyncPullResponse, SyncPushRequest, SyncPushResponse};

/// POST /api/sync/push
pub async fn push(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<SyncPushRequest>,
) -> Result<Json<SyncPushResponse>, AppError> {
    if req.device_id.is_empty() {
        return Err(AppError::BadRequest("device_id is required".into()));
    }

    let response = sync_service::push(
        &state.db,
        auth.user_id,
        &req.device_id,
        req.items,
        req.folders,
    )
    .await?;

    Ok(Json(response))
}

#[derive(Debug, Deserialize)]
pub struct PullParams {
    pub since: Option<DateTime<Utc>>,
    pub device_id: String,
}

/// GET /api/sync/pull?since=<ISO8601>&device_id=<id>
pub async fn pull(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(params): Query<PullParams>,
) -> Result<Json<SyncPullResponse>, AppError> {
    let response = sync_service::pull(
        &state.db,
        auth.user_id,
        params.since,
        &params.device_id,
    )
    .await?;

    Ok(Json(response))
}

/// DELETE /api/sync/purge
pub async fn purge(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let deleted_count = sync_service::purge(&state.db, auth.user_id).await?;

    Ok(Json(serde_json::json!({ "deleted_count": deleted_count })))
}
