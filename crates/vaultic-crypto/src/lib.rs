//! Vaultic cryptographic primitives: Argon2id KDF, AES-256-GCM encryption, HKDF key derivation, password generation.

pub mod cipher;
pub mod kdf;
pub mod password_gen;

pub use cipher::{decrypt, encrypt};
pub use kdf::{derive_auth_hash, derive_encryption_key, derive_master_key};
pub use password_gen::generate_password;
