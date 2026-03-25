//! Key derivation functions: Argon2id for master key, HKDF for sub-keys.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum KdfError {
    #[error("argon2 hashing failed: {0}")]
    Argon2(String),
    #[error("hkdf expand failed: {0}")]
    HkdfExpand(String),
}

/// Derive master key from password + salt using Argon2id.
pub fn derive_master_key(_password: &[u8], _salt: &[u8]) -> Result<[u8; 32], KdfError> {
    // Implementation in Phase 2
    todo!("Phase 2: Argon2id KDF")
}

/// Derive encryption key from master key using HKDF.
pub fn derive_encryption_key(_master_key: &[u8]) -> Result<[u8; 32], KdfError> {
    // Implementation in Phase 2
    todo!("Phase 2: HKDF derive encryption key")
}

/// Derive auth hash from master key for server authentication.
pub fn derive_auth_hash(_master_key: &[u8]) -> Result<[u8; 32], KdfError> {
    // Implementation in Phase 2
    todo!("Phase 2: HKDF derive auth hash")
}
