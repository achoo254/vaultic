---
phase: 3
title: "Recovery Codes"
status: pending
priority: P1
effort: 3h
depends_on: [1]
---

# Phase 3: Recovery Codes

## Context
- [Research: 2FA](../reports/researcher-260325-2fa-passkeys-srp.md)
- Entity: `crates/vaultic-server/src/entities/recovery_code.rs` (created in Phase 1)

## Overview

Generate 10 single-use recovery codes when MFA is first enabled. Codes hashed with Argon2id. User can regenerate (replaces all). Recovery code works as alternative to TOTP/passkey during login.

## Requirements

- 10 codes per generation, 8-char alphanumeric (A-Z, 0-9, no ambiguous chars)
- Hashed with Argon2id before storage (same params as user auth)
- One-time use: mark `used_at` after successful verification
- Regenerate: deletes all existing codes, generates fresh set
- Works in MFA login flow as alternative to TOTP code

## Architecture

### Character Set
```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
// Excluded: I, O, 0, 1 (ambiguous)
```

### Generate Flow
```
generate 10 random 8-char codes
  → for each: hash = argon2id(code)
  → store (user_id, hash, used_at=NULL) in recovery_codes
  → return plaintext codes to client (one-time display)
```

### Verify Flow (during MFA login)
```
POST /api/auth/mfa/recovery/verify { mfa_token, code }
  → load all unused recovery_codes for user
  → for each: argon2id_verify(code, stored_hash)
  → if match: set used_at = now(), issue JWT tokens
```

## Related Code Files

### Modify
- `crates/vaultic-server/src/router.rs` — add recovery routes
- `crates/vaultic-server/src/handlers/mfa.rs` — add recovery handlers
- `crates/vaultic-types/src/mfa.rs` — add recovery types

### Create
- `crates/vaultic-server/src/services/recovery_service.rs`

## Implementation Steps

### 1. Add recovery types (`vaultic-types/src/mfa.rs`)

```rust
pub struct RecoveryCodesResponse {
    pub codes: Vec<String>,  // 10 plaintext codes
}
pub struct RecoveryVerifyRequest {
    pub mfa_token: String,
    pub code: String,
}
pub struct RecoveryRegenerateResponse {
    pub codes: Vec<String>,  // fresh 10 codes
}
```

### 2. Create recovery service (`services/recovery_service.rs`)

```rust
const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN: usize = 8;
const CODE_COUNT: usize = 10;

pub async fn generate_codes(db, user_id) -> Result<Vec<String>>
// 1. Delete existing recovery_codes for user_id
// 2. Generate 10 random 8-char codes from CHARSET
// 3. For each: hash with argon2id (use vaultic-crypto or argon2 crate)
// 4. Insert 10 rows into recovery_codes
// 5. Return plaintext codes

pub async fn verify_code(db, config, mfa_token, code) -> Result<(String,String,Uuid)>
// 1. Decode mfa_token → user_id
// 2. Load unused recovery_codes (used_at IS NULL) for user
// 3. Normalize input: uppercase, strip spaces/dashes
// 4. For each stored hash: verify with argon2id
// 5. If match: set used_at = now()
// 6. Issue access_token + refresh_token
// 7. If no match: return Unauthorized

pub async fn regenerate_codes(db, user_id) -> Result<Vec<String>>
// Same as generate_codes — deletes old, creates new

fn generate_single_code() -> String
// Random 8 chars from CHARSET using rand::thread_rng
```

### 3. Argon2id hashing for codes

```rust
// Use the argon2 crate already in vaultic-crypto
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;

fn hash_code(code: &str) -> String {
    let salt = SaltString::generate(&mut rand::thread_rng());
    let argon2 = Argon2::default(); // Uses recommended params
    argon2.hash_password(code.as_bytes(), &salt)
        .unwrap().to_string()
}

fn verify_code_hash(code: &str, hash: &str) -> bool {
    let parsed = argon2::PasswordHash::new(hash).unwrap();
    Argon2::default().verify_password(code.as_bytes(), &parsed).is_ok()
}
```

### 4. Add handlers (`handlers/mfa.rs`)

```rust
pub async fn generate_recovery(State(state), auth: AuthUser) -> Result<Json<RecoveryCodesResponse>>
pub async fn verify_recovery(State(state), Json(req)) -> Result<Json<AuthResponse>>  // no AuthUser
pub async fn regenerate_recovery(State(state), auth: AuthUser) -> Result<Json<RecoveryRegenerateResponse>>
```

### 5. Register routes (`router.rs`)

```rust
// Add to mfa_routes (requires auth):
.route("/recovery/generate", post(handlers::mfa::generate_recovery))
.route("/recovery/regenerate", post(handlers::mfa::regenerate_recovery))

// Add to mfa_public_routes (uses mfa_token):
.route("/recovery/verify", post(handlers::mfa::verify_recovery))
```

## Todo

- [ ] Add recovery types to `vaultic-types/src/mfa.rs`
- [ ] Create `services/recovery_service.rs`
- [ ] Add `argon2` + `password-hash` deps to vaultic-server Cargo.toml (if not already)
- [ ] Add recovery handlers to `handlers/mfa.rs`
- [ ] Register recovery routes
- [ ] `cargo build -p vaultic-server` passes
- [ ] Test: generate codes → use one → verify it's consumed → remaining work

## Success Criteria

- 10 codes generated, each 8 chars from safe charset
- Codes stored as Argon2id hashes (plaintext never persisted)
- Used code marked with `used_at`, cannot be reused
- Recovery code works in MFA login flow as TOTP alternative
- Regenerate replaces all existing codes

## Security Considerations

- Argon2id prevents brute-force of recovery codes even if DB leaked
- Codes displayed once to user, never retrievable after
- Input normalized (uppercase, strip formatting) to reduce user errors
- Each code single-use — `used_at` prevents replay
- Regenerate invalidates all previous codes
