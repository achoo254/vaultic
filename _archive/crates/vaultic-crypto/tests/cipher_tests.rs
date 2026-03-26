//! Tests for AES-256-GCM encrypt/decrypt.

use vaultic_crypto::{decrypt, derive_encryption_key, derive_master_key, encrypt};

fn test_key() -> vaultic_crypto::EncryptionKey {
    let mk = derive_master_key(b"test-password", b"test@example.com").unwrap();
    derive_encryption_key(&mk).unwrap()
}

#[test]
fn encrypt_decrypt_roundtrip() {
    let key = test_key();
    let plaintext = b"hello world";
    let encrypted = encrypt(&key, plaintext).unwrap();
    let decrypted = decrypt(&key, &encrypted).unwrap();
    assert_eq!(decrypted, plaintext);
}

#[test]
fn encrypt_decrypt_empty_plaintext() {
    let key = test_key();
    let encrypted = encrypt(&key, b"").unwrap();
    let decrypted = decrypt(&key, &encrypted).unwrap();
    assert_eq!(decrypted, b"");
}

#[test]
fn encrypt_decrypt_large_payload() {
    let key = test_key();
    let plaintext = vec![0xABu8; 100_000]; // 100KB
    let encrypted = encrypt(&key, &plaintext).unwrap();
    let decrypted = decrypt(&key, &encrypted).unwrap();
    assert_eq!(decrypted, plaintext);
}

#[test]
fn ciphertext_includes_nonce_prefix() {
    let key = test_key();
    let encrypted = encrypt(&key, b"test").unwrap();
    // nonce (12) + ciphertext (4) + tag (16) = 32 minimum
    assert!(encrypted.len() >= 12 + 16);
}

#[test]
fn each_encryption_produces_different_ciphertext() {
    let key = test_key();
    let plaintext = b"same data";
    let enc1 = encrypt(&key, plaintext).unwrap();
    let enc2 = encrypt(&key, plaintext).unwrap();
    // Random nonce ensures different ciphertext each time
    assert_ne!(enc1, enc2);
}

#[test]
fn decrypt_with_wrong_key_fails() {
    let mk1 = derive_master_key(b"password1", b"user@test.com").unwrap();
    let mk2 = derive_master_key(b"password2", b"user@test.com").unwrap();
    let key1 = derive_encryption_key(&mk1).unwrap();
    let key2 = derive_encryption_key(&mk2).unwrap();

    let encrypted = encrypt(&key1, b"secret").unwrap();
    assert!(decrypt(&key2, &encrypted).is_err());
}

#[test]
fn decrypt_tampered_ciphertext_fails() {
    let key = test_key();
    let mut encrypted = encrypt(&key, b"secret").unwrap();
    // Tamper with ciphertext (after nonce)
    if encrypted.len() > 14 {
        encrypted[14] ^= 0xFF;
    }
    assert!(decrypt(&key, &encrypted).is_err());
}

#[test]
fn decrypt_too_short_input_fails() {
    let key = test_key();
    assert!(decrypt(&key, &[0u8; 10]).is_err());
}
