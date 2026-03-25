//! Server configuration loaded from environment variables.

use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub server_port: u16,
    /// Access token lifetime in minutes (default: 15)
    pub access_token_ttl_min: u64,
    /// Refresh token lifetime in days (default: 7)
    pub refresh_token_ttl_days: u64,
}

impl AppConfig {
    /// Load configuration from environment variables.
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .map_err(|_| "DATABASE_URL must be set")?,
            jwt_secret: env::var("JWT_SECRET")
                .map_err(|_| "JWT_SECRET must be set")?,
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .map_err(|_| "SERVER_PORT must be a valid port number")?,
            access_token_ttl_min: env::var("ACCESS_TOKEN_TTL_MIN")
                .unwrap_or_else(|_| "15".into())
                .parse()
                .unwrap_or(15),
            refresh_token_ttl_days: env::var("REFRESH_TOKEN_TTL_DAYS")
                .unwrap_or_else(|_| "7".into())
                .parse()
                .unwrap_or(7),
        })
    }
}
