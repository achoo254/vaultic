//! Tests for key derivation functions (Argon2id + HKDF).

use vaultic_crypto::{derive_auth_hash, derive_encryption_key, derive_master_key};

#[test]
fn master_key_is_deterministic() {
    let mk1 = derive_master_key(b"password123", b"user@example.com").unwrap();
    let mk2 = derive_master_key(b"password123", b"user@example.com").unwrap();
    assert_eq!(mk1.as_bytes(), mk2.as_bytes());
}

#[test]
fn different_passwords_produce_different_keys() {
    let mk1 = derive_master_key(b"password1", b"user@example.com").unwrap();
    let mk2 = derive_master_key(b"password2", b"user@example.com").unwrap();
    assert_ne!(mk1.as_bytes(), mk2.as_bytes());
}

#[test]
fn different_emails_produce_different_keys() {
    let mk1 = derive_master_key(b"password123", b"alice@example.com").unwrap();
    let mk2 = derive_master_key(b"password123", b"bob@example.com").unwrap();
    assert_ne!(mk1.as_bytes(), mk2.as_bytes());
}

#[test]
fn encryption_key_derivation_is_deterministic() {
    let mk = derive_master_key(b"password123", b"user@example.com").unwrap();
    let ek1 = derive_encryption_key(&mk).unwrap();
    let ek2 = derive_encryption_key(&mk).unwrap();
    assert_eq!(ek1.as_bytes(), ek2.as_bytes());
}

#[test]
fn auth_hash_is_deterministic() {
    let mk = derive_master_key(b"password123", b"user@example.com").unwrap();
    let ah1 = derive_auth_hash(&mk).unwrap();
    let ah2 = derive_auth_hash(&mk).unwrap();
    assert_eq!(ah1.as_hex(), ah2.as_hex());
}

#[test]
fn auth_hash_differs_from_encryption_key() {
    let mk = derive_master_key(b"password123", b"user@example.com").unwrap();
    let ek = derive_encryption_key(&mk).unwrap();
    let ah = derive_auth_hash(&mk).unwrap();
    // Auth hash is hex-encoded SHA256, enc key is raw bytes — domain separation ensures they differ
    assert_ne!(hex::encode(ek.as_bytes()), ah.as_hex());
}

#[test]
fn auth_hash_is_valid_hex_64_chars() {
    let mk = derive_master_key(b"test", b"test@test.com").unwrap();
    let ah = derive_auth_hash(&mk).unwrap();
    assert_eq!(ah.as_hex().len(), 64); // SHA-256 = 32 bytes = 64 hex chars
    assert!(ah.as_hex().chars().all(|c| c.is_ascii_hexdigit()));
}
