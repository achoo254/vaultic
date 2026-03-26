//! Newtype wrappers for cryptographic keys with automatic zeroization on drop.

use zeroize::{Zeroize, ZeroizeOnDrop};

/// 256-bit master key derived from password via Argon2id.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct MasterKey(pub(crate) [u8; 32]);

impl MasterKey {
    /// Access the raw key bytes.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

/// 256-bit encryption key derived from master key via HKDF.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct EncryptionKey(pub(crate) [u8; 32]);

impl EncryptionKey {
    /// Access the raw key bytes.
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

/// Hex-encoded authentication hash sent to server for login verification.
pub struct AuthHash(pub(crate) String);

impl AuthHash {
    /// Get the hex-encoded hash string.
    pub fn as_hex(&self) -> &str {
        &self.0
    }
}

impl Drop for AuthHash {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}
