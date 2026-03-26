//! Unified error type for all cryptographic operations.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("key derivation failed: {0}")]
    Kdf(String),

    #[error("encryption failed: {0}")]
    Encryption(String),

    #[error("decryption failed: {0}")]
    Decryption(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),
}
