//! Vaultic cryptographic primitives: Argon2id KDF, AES-256-GCM encryption, HKDF key derivation, password generation.

pub mod cipher;
pub mod error;
pub mod kdf;
pub mod password_gen;
pub mod types;

pub use cipher::{decrypt, encrypt};
pub use error::CryptoError;
pub use kdf::{derive_auth_hash, derive_encryption_key, derive_master_key};
pub use password_gen::{generate_password, generate_share_key, PasswordGenOptions, ShareKey};
pub use types::{AuthHash, EncryptionKey, MasterKey};
