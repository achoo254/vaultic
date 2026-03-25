//! Route definitions for the Vaultic API server.

use axum::http::{header, StatusCode};
use axum::response::IntoResponse;
use axum::routing::{delete, get, post};
use axum::Router;

use crate::handlers;
use crate::AppState;

pub fn create_router(state: AppState) -> Router {
    let auth_routes = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/refresh", post(handlers::auth::refresh));

    let sync_routes = Router::new()
        .route("/push", post(handlers::sync::push))
        .route("/pull", get(handlers::sync::pull))
        .route("/purge", delete(handlers::sync::purge));

    let share_routes = Router::new()
        .route("/", post(handlers::share::create))
        .route("/{id}", get(handlers::share::retrieve))
        .route("/{id}", delete(handlers::share::delete));

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .nest("/api/auth", auth_routes)
        .nest("/api/sync", sync_routes)
        .nest("/api/share", share_routes)
        // Recipient share page — serves static HTML, decryption happens client-side
        .route("/s/{id}", get(serve_share_page))
        .with_state(state)
}

/// Serve the static share page HTML. The share ID is in the URL path,
/// the decryption key is in the URL fragment (never sent to server).
async fn serve_share_page() -> impl IntoResponse {
    const SHARE_HTML: &str = include_str!("../static/share-page.html");
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        SHARE_HTML,
    )
}
