//! Vaultic API server — auth + sync relay + share broker.

use std::net::SocketAddr;

use sea_orm::Database;
use sea_orm_migration::MigratorTrait;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::EnvFilter;

mod config;
mod entities;
mod error;
mod handlers;
mod middleware;
mod router;
mod services;

use config::AppConfig;

/// Shared application state passed to all handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: sea_orm::DatabaseConnection,
    pub config: AppConfig,
}

#[tokio::main]
async fn main() {
    // Load .env if present
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = AppConfig::from_env().expect("failed to load config");

    // Connect to PostgreSQL
    let db = Database::connect(&config.database_url)
        .await
        .expect("failed to connect to database");

    // Run pending migrations
    vaultic_migration::Migrator::up(&db, None)
        .await
        .expect("failed to run migrations");

    tracing::info!("Database connected and migrations applied");

    let addr = SocketAddr::from(([0, 0, 0, 0], config.server_port));

    let state = AppState {
        db,
        config: config.clone(),
    };

    // CORS: allow extension origin in production, any in dev
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = router::create_router(state)
        .layer(cors)
        .layer(axum::Extension(config));

    tracing::info!("Vaultic server listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
