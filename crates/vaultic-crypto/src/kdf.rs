//! Key derivation functions: Argon2id for master key, HKDF-SHA256 for sub-keys.

use argon2::{Algorithm, Argon2, Params, Version};
use hkdf::Hkdf;
use sha2::Sha256;
use zeroize::Zeroize;

use crate::error::CryptoError;
use crate::types::{AuthHash, EncryptionKey, MasterKey};

/// Argon2id parameters per OWASP recommendations: 64MB memory, 3 iterations, 4 parallelism.
const ARGON2_M_COST: u32 = 65536; // 64MB in KiB
const ARGON2_T_COST: u32 = 3;
const ARGON2_P_COST: u32 = 4;
const KEY_LENGTH: usize = 32;

/// HKDF info strings for domain separation.
const HKDF_INFO_ENC: &[u8] = b"vaultic-enc";
const HKDF_INFO_AUTH: &[u8] = b"vaultic-auth";

/// Derive a 256-bit master key from password + email using Argon2id.
///
/// Email is used as salt (same approach as Bitwarden) to ensure unique keys per account.
pub fn derive_master_key(password: &[u8], email: &[u8]) -> Result<MasterKey, CryptoError> {
    let params = Params::new(
        ARGON2_M_COST,
        ARGON2_T_COST,
        ARGON2_P_COST,
        Some(KEY_LENGTH),
    )
    .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; KEY_LENGTH];
    argon2
        .hash_password_into(password, email, &mut key)
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;

    Ok(MasterKey(key))
}

/// Derive a 256-bit encryption key from master key using HKDF-SHA256.
///
/// Uses "vaultic-enc" as info for domain separation.
pub fn derive_encryption_key(master_key: &MasterKey) -> Result<EncryptionKey, CryptoError> {
    let hk = Hkdf::<Sha256>::new(None, master_key.as_bytes());
    let mut enc_key = [0u8; KEY_LENGTH];
    hk.expand(HKDF_INFO_ENC, &mut enc_key)
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    Ok(EncryptionKey(enc_key))
}

/// Derive an authentication hash from master key for server-side verification.
///
/// Uses HKDF with "vaultic-auth" info, then hashes once more with SHA-256
/// so the server never sees a value that could derive the encryption key.
pub fn derive_auth_hash(master_key: &MasterKey) -> Result<AuthHash, CryptoError> {
    let hk = Hkdf::<Sha256>::new(None, master_key.as_bytes());
    let mut auth_key = [0u8; KEY_LENGTH];
    hk.expand(HKDF_INFO_AUTH, &mut auth_key)
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;

    // Hash once more before sending to server
    use sha2::Digest;
    #[allow(clippy::needless_borrows_for_generic_args)]
    let hash = Sha256::digest(&auth_key);
    auth_key.zeroize(); // Clear intermediate key material from stack
    Ok(AuthHash(hex::encode(hash)))
}
