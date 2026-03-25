//! AES-256-GCM encryption and decryption.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CipherError {
    #[error("encryption failed: {0}")]
    Encrypt(String),
    #[error("decryption failed: {0}")]
    Decrypt(String),
}

/// Encrypt plaintext with AES-256-GCM. Returns nonce + ciphertext.
pub fn encrypt(_key: &[u8; 32], _plaintext: &[u8]) -> Result<Vec<u8>, CipherError> {
    // Implementation in Phase 2
    todo!("Phase 2: AES-256-GCM encrypt")
}

/// Decrypt ciphertext (nonce + ciphertext) with AES-256-GCM.
pub fn decrypt(_key: &[u8; 32], _ciphertext: &[u8]) -> Result<Vec<u8>, CipherError> {
    // Implementation in Phase 2
    todo!("Phase 2: AES-256-GCM decrypt")
}
