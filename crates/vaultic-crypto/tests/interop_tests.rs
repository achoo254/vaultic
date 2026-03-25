//! Interop test vectors for cross-platform verification with WebCrypto (TypeScript).
//!
//! These tests produce deterministic outputs that can be verified in the browser extension's
//! WebCrypto implementation to ensure Rust ↔ TypeScript crypto compatibility.

use vaultic_crypto::{derive_auth_hash, derive_encryption_key, derive_master_key};

/// Known test vector: fixed password + email → fixed master key, enc key, auth hash.
/// The TypeScript WebCrypto implementation MUST produce identical values.
#[test]
fn known_vector_kdf() {
    let mk = derive_master_key(b"correct-horse-battery-staple", b"alice@vaultic.app").unwrap();

    // Master key should be deterministic — capture and print for WebCrypto test
    let mk_hex = hex::encode(mk.as_bytes());
    println!("master_key_hex: {mk_hex}");

    let ek = derive_encryption_key(&mk).unwrap();
    let ek_hex = hex::encode(ek.as_bytes());
    println!("encryption_key_hex: {ek_hex}");

    let ah = derive_auth_hash(&mk).unwrap();
    println!("auth_hash_hex: {}", ah.as_hex());

    // These values are stable — once set, they become the reference vectors
    assert_eq!(mk_hex.len(), 64);
    assert_eq!(ek_hex.len(), 64);
    assert_eq!(ah.as_hex().len(), 64);
}

/// Generate JSON test vectors for export to TypeScript tests.
#[test]
fn export_test_vectors_json() {
    let cases = vec![
        ("test-password", "user@example.com"),
        ("correct-horse-battery-staple", "alice@vaultic.app"),
        ("P@ssw0rd!123", "bob@test.org"),
    ];

    let mut vectors = Vec::new();
    for (password, email) in &cases {
        let mk = derive_master_key(password.as_bytes(), email.as_bytes()).unwrap();
        let ek = derive_encryption_key(&mk).unwrap();
        let ah = derive_auth_hash(&mk).unwrap();

        vectors.push(serde_json::json!({
            "password": password,
            "email": email,
            "master_key_hex": hex::encode(mk.as_bytes()),
            "encryption_key_hex": hex::encode(ek.as_bytes()),
            "auth_hash_hex": ah.as_hex(),
        }));
    }

    let json = serde_json::to_string_pretty(&vectors).unwrap();
    println!("=== TEST VECTORS ===\n{json}\n=== END ===");

    // Write to file for TypeScript consumption
    let vectors_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("test-vectors.json");
    std::fs::write(&vectors_path, &json).unwrap();
    println!("Wrote test vectors to: {}", vectors_path.display());
}
