---
phase: 2
priority: critical
status: pending
estimated_days: 4
depends_on: [1]
---

# Phase 2: Crypto Core (Rust)

## Overview
Implement `vaultic-crypto` crate: key derivation (Argon2id + HKDF), encryption (AES-256-GCM), password generator. This is the security foundation — must be heavily unit-tested.

## Context Links
- [Brainstorm Crypto Architecture](../reports/brainstorm-260324-2007-vaultic-password-manager-architecture.md#crypto-architecture)
- [Research Crypto Crates](../reports/researcher-260324-2025-vaultic-architecture-research.md#5)

## Key Insights
- Use ONLY audited RustCrypto crates. Never write custom crypto.
- Argon2id params: m=64MB, t=3, p=4 (OWASP recommended)
- AES-256-GCM with random 96-bit nonce per encryption
- HKDF-SHA256 for deriving enc_key and auth_key from master_key
- All functions must be deterministic for cross-platform testing (extension uses WebCrypto)

## Requirements
### Functional
- `derive_master_key(password, email) → master_key` (Argon2id)
- `derive_encryption_key(master_key) → enc_key` (HKDF)
- `derive_auth_hash(master_key) → auth_hash` (HKDF + SHA256)
- `encrypt(enc_key, plaintext) → ciphertext` (AES-256-GCM)
- `decrypt(enc_key, ciphertext) → plaintext` (AES-256-GCM)
- `generate_password(length, options) → password`
- `generate_share_key() → random 256-bit key`

### Non-Functional
- No panics — all functions return `Result<T, CryptoError>`
- No unsafe code
- Constant-time comparison for auth hash
- Thread-safe (can be used from Axum handlers)

## Architecture

```
vaultic-crypto/
├── src/
│   ├── lib.rs              # Public API exports
│   ├── kdf.rs              # Key derivation (Argon2id + HKDF)
│   ├── cipher.rs           # AES-256-GCM encrypt/decrypt
│   ├── password_gen.rs     # Password generator
│   ├── error.rs            # CryptoError enum
│   └── types.rs            # MasterKey, EncryptionKey, etc. (newtype wrappers)
└── tests/
    ├── kdf_tests.rs
    ├── cipher_tests.rs
    ├── password_gen_tests.rs
    └── interop_tests.rs    # Test vectors matching WebCrypto output
```

## Implementation Steps

### 1. Define types and errors (1h)

`src/types.rs`:
```rust
pub struct MasterKey([u8; 32]);
pub struct EncryptionKey([u8; 32]);
pub struct AuthHash(String);  // hex-encoded

impl Drop for MasterKey {
    fn drop(&mut self) { self.0.zeroize(); }
}
```

`src/error.rs`:
```rust
#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("Key derivation failed: {0}")]
    KdfError(String),
    #[error("Encryption failed: {0}")]
    EncryptionError(String),
    #[error("Decryption failed: {0}")]
    DecryptionError(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}
```

### 2. Key derivation — kdf.rs (4h)

```rust
use argon2::{Argon2, Params, Algorithm, Version};
use hkdf::Hkdf;
use sha2::Sha256;

pub fn derive_master_key(password: &str, email: &str) -> Result<MasterKey, CryptoError> {
    let salt = email.as_bytes(); // email as salt (like Bitwarden)
    let params = Params::new(65536, 3, 4, Some(32))?; // 64MB, 3 iterations, 4 parallelism
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon2.hash_password_into(password.as_bytes(), salt, &mut key)?;
    Ok(MasterKey(key))
}

pub fn derive_encryption_key(master_key: &MasterKey) -> Result<EncryptionKey, CryptoError> {
    let hk = Hkdf::<Sha256>::new(None, &master_key.0);
    let mut enc_key = [0u8; 32];
    hk.expand(b"vaultic-enc", &mut enc_key)?;
    Ok(EncryptionKey(enc_key))
}

pub fn derive_auth_hash(master_key: &MasterKey) -> Result<AuthHash, CryptoError> {
    let hk = Hkdf::<Sha256>::new(None, &master_key.0);
    let mut auth_key = [0u8; 32];
    hk.expand(b"vaultic-auth", &mut auth_key)?;
    // Hash one more time before sending to server
    let hash = Sha256::digest(&auth_key);
    Ok(AuthHash(hex::encode(hash)))
}
```

### 3. Encryption — cipher.rs (3h)

```rust
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::Aead;
use rand::RngCore;

/// Encrypted format: nonce (12 bytes) + ciphertext + tag (16 bytes)
pub fn encrypt(key: &EncryptionKey, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(&key.0)?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext)?;
    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

pub fn decrypt(key: &EncryptionKey, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if data.len() < 12 { return Err(CryptoError::InvalidInput("too short")); }
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(&key.0)?;
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher.decrypt(nonce, ciphertext).map_err(|e| CryptoError::DecryptionError(e.to_string()))
}
```

### 4. Password generator — password_gen.rs (2h)

```rust
pub struct PasswordOptions {
    pub length: usize,        // 8-128
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub symbols: bool,
    pub exclude_ambiguous: bool, // 0O1lI
}

pub fn generate_password(opts: &PasswordOptions) -> Result<String, CryptoError> {
    // Build charset from options
    // Use rand::thread_rng() (CSPRNG) for each character
    // Ensure at least 1 char from each enabled category
}
```

### 5. Unit tests + interop test vectors (4h)

Create test vectors that can be verified in both Rust and TypeScript (WebCrypto):
```rust
#[test]
fn test_known_vector_encrypt_decrypt() {
    // Fixed key + nonce → expected ciphertext
    // Same test in TypeScript WebCrypto must produce identical output
}

#[test]
fn test_kdf_deterministic() {
    // Same password + email → same master_key every time
}

#[test]
fn test_encrypt_decrypt_roundtrip() {
    let key = derive_encryption_key(&derive_master_key("test", "a@b.com").unwrap()).unwrap();
    let plaintext = b"hello world";
    let encrypted = encrypt(&key, plaintext).unwrap();
    let decrypted = decrypt(&key, &encrypted).unwrap();
    assert_eq!(decrypted, plaintext);
}
```

### 6. Export test vectors as JSON (1h)
Generate `test-vectors.json` for TypeScript WebCrypto interop testing in Phase 4.

## Todo List
- [ ] Define MasterKey, EncryptionKey types with zeroize
- [ ] CryptoError enum
- [ ] Argon2id key derivation (derive_master_key)
- [ ] HKDF key expansion (derive_encryption_key, derive_auth_hash)
- [ ] AES-256-GCM encrypt (nonce prepended)
- [ ] AES-256-GCM decrypt
- [ ] Password generator with options
- [ ] generate_share_key (random 256-bit)
- [ ] Unit tests: KDF determinism
- [ ] Unit tests: encrypt/decrypt roundtrip
- [ ] Unit tests: password generator constraints
- [ ] Known test vectors for WebCrypto interop
- [ ] Export test-vectors.json
- [ ] `cargo test` all pass
- [ ] `cargo clippy` no warnings

## Success Criteria
- All crypto functions return Result, no panics
- encrypt/decrypt roundtrip works for all sizes (0 bytes to 1MB)
- KDF is deterministic (same input → same output)
- Password generator respects all options
- Test vectors match WebCrypto output (verified in Phase 4)
- No unsafe code, no custom crypto algorithms
