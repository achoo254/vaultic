//! Secure share service: create, retrieve (with view counting), delete.

use chrono::{Duration, Utc};
use rand::Rng;
use sea_orm::prelude::Expr;
use sea_orm::*;
use uuid::Uuid;

use crate::entities::secure_share;
use crate::error::AppError;

const ID_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SHARE_ID_LEN: usize = 12;

/// Generate a 12-char URL-safe random ID.
fn generate_share_id() -> String {
    let mut rng = rand::thread_rng();
    (0..SHARE_ID_LEN)
        .map(|_| ID_CHARS[rng.gen_range(0..ID_CHARS.len())] as char)
        .collect()
}

/// Create a new secure share link.
pub async fn create(
    db: &DatabaseConnection,
    user_id: Uuid,
    encrypted_data: &str,
    max_views: Option<i32>,
    ttl_hours: Option<i32>,
    vault_item_id: Option<Uuid>,
) -> Result<String, AppError> {
    let share_id = generate_share_id();
    let expires_at = ttl_hours.map(|h| (Utc::now() + Duration::hours(h as i64)).into());

    let share = secure_share::ActiveModel {
        id: Set(share_id.clone()),
        vault_item_id: Set(vault_item_id),
        user_id: Set(user_id),
        encrypted_data: Set(encrypted_data.to_string()),
        max_views: Set(max_views),
        current_views: Set(0),
        expires_at: Set(expires_at),
        created_at: Set(Some(Utc::now().into())),
        accessed_at: Set(None),
    };

    secure_share::Entity::insert(share).exec(db).await?;

    Ok(share_id)
}

/// Retrieve a share by ID using atomic view count increment to prevent TOCTOU races.
pub async fn retrieve(
    db: &DatabaseConnection,
    share_id: &str,
) -> Result<String, AppError> {
    let share = secure_share::Entity::find_by_id(share_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("share not found".into()))?;

    // Check expiry
    if let Some(expires_at) = share.expires_at {
        let expires: chrono::DateTime<Utc> = expires_at.into();
        if Utc::now() > expires {
            return Err(AppError::Gone("share link has expired".into()));
        }
    }

    // Atomic increment: UPDATE ... SET current_views = current_views + 1
    // WHERE id = ? AND (max_views IS NULL OR current_views < max_views)
    let result = secure_share::Entity::update_many()
        .filter(secure_share::Column::Id.eq(share_id))
        .filter(
            Condition::any()
                .add(secure_share::Column::MaxViews.is_null())
                .add(
                    Expr::col(secure_share::Column::CurrentViews)
                        .lt(Expr::col(secure_share::Column::MaxViews)),
                ),
        )
        .col_expr(
            secure_share::Column::CurrentViews,
            Expr::col(secure_share::Column::CurrentViews).add(1),
        )
        .col_expr(
            secure_share::Column::AccessedAt,
            Expr::value(Utc::now()),
        )
        .exec(db)
        .await?;

    if result.rows_affected == 0 {
        return Err(AppError::Gone("share link max views reached".into()));
    }

    Ok(share.encrypted_data)
}

/// Get share metadata without counting a view.
pub async fn get_meta(
    db: &DatabaseConnection,
    share_id: &str,
) -> Result<(Option<i32>, i32, Option<chrono::DateTime<Utc>>), AppError> {
    let share = secure_share::Entity::find_by_id(share_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("share not found".into()))?;

    // Check expiry
    if let Some(expires_at) = share.expires_at {
        let expires: chrono::DateTime<Utc> = expires_at.into();
        if Utc::now() > expires {
            return Err(AppError::Gone("share link has expired".into()));
        }
    }

    // Check max views reached
    if let Some(max) = share.max_views {
        if share.current_views >= max {
            return Err(AppError::Gone("share link max views reached".into()));
        }
    }

    let expires_at = share.expires_at.map(|e| e.into());
    Ok((share.max_views, share.current_views, expires_at))
}

/// Delete a share (owner only).
pub async fn delete(
    db: &DatabaseConnection,
    share_id: &str,
    user_id: Uuid,
) -> Result<(), AppError> {
    let share = secure_share::Entity::find_by_id(share_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("share not found".into()))?;

    if share.user_id != user_id {
        return Err(AppError::Unauthorized("not the share owner".into()));
    }

    secure_share::Entity::delete_by_id(share_id).exec(db).await?;

    Ok(())
}
