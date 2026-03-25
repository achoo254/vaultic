---
phase: 2
title: "TOTP 2FA"
status: pending
priority: P1
effort: 4h
depends_on: [1]
---

# Phase 2: TOTP 2FA

## Context
- [Research: 2FA](../reports/researcher-260325-2fa-passkeys-srp.md)
- Handler pattern: `crates/vaultic-server/src/handlers/auth.rs`
- Service pattern: `crates/vaultic-server/src/services/auth_service.rs`
- Types pattern: `crates/vaultic-types/src/user.rs`

## Overview

3 endpoints: setup (generate secret + QR), verify (confirm setup with 6-digit code), disable. TOTP secret encrypted server-side. Login flow modified to check `mfa_enabled` and require TOTP token.

## Requirements

- RFC 6238 compliant TOTP, SHA1 algorithm, 6 digits, 30s period
- QR code as base64 PNG for authenticator app scanning
- Encrypted TOTP secret storage (AES-256-GCM)
- Login returns `mfa_required: true` when TOTP enabled; second call with TOTP code completes auth
- Rate limit: 5 failed TOTP attempts → reject (tracked in-memory for MVP)

## Architecture

### Setup Flow
```
Client → POST /api/auth/mfa/totp/setup (AuthUser)
Server → generate secret → encrypt → store in mfa_methods
       → return { secret, qr_code_base64, otpauth_url }
```

### Verify Flow (confirms setup)
```
Client → POST /api/auth/mfa/totp/verify { code: "123456" }
Server → decrypt secret → validate code → set verified_at + mfa_enabled=true
       → generate recovery codes → return { recovery_codes: [...] }
```

### Login with MFA
```
Client → POST /api/auth/login { email, auth_hash }
Server → password OK + mfa_enabled=true
       → return { mfa_required: true, mfa_token: "..." } (short-lived, 5min)

Client → POST /api/auth/mfa/totp/validate { mfa_token, code }
Server → validate mfa_token + TOTP code → return { access_token, refresh_token }
```

## Related Code Files

### Modify
- `crates/vaultic-server/Cargo.toml` — add `totp-rs`, `base64`
- `crates/vaultic-server/src/router.rs` — add MFA routes
- `crates/vaultic-server/src/handlers/mod.rs` — export mfa module
- `crates/vaultic-server/src/services/mod.rs` — export mfa_service
- `crates/vaultic-server/src/services/auth_service.rs` — modify login for MFA check
- `crates/vaultic-types/src/lib.rs` — export mfa module
- `crates/vaultic-server/src/config.rs` — add `mfa_secret_key` env var
- `crates/vaultic-server/src/error.rs` — add `MfaRequired` variant

### Create
- `crates/vaultic-server/src/handlers/mfa.rs`
- `crates/vaultic-server/src/services/mfa_service.rs`
- `crates/vaultic-types/src/mfa.rs`

## Implementation Steps

### 1. Add dependencies to Cargo.toml

```toml
totp-rs = { version = "5.7", features = ["qr", "otpauth", "serde_support"] }
base64 = "0.22"
```

### 2. Add MFA types (`vaultic-types/src/mfa.rs`)

```rust
// Request/Response types:
pub struct TotpSetupResponse {
    pub secret: String,          // base32 secret for manual entry
    pub qr_code_base64: String,  // PNG base64
    pub otpauth_url: String,
}
pub struct TotpVerifyRequest { pub code: String }
pub struct TotpVerifyResponse { pub recovery_codes: Vec<String> }
pub struct MfaLoginResponse {
    pub mfa_required: bool,
    pub mfa_token: String,       // short-lived JWT (5min)
}
pub struct MfaValidateRequest { pub mfa_token: String, pub code: String }
pub struct TotpDisableRequest { pub code: String }  // verify before disable
```

### 3. Add `MfaRequired` to AppError

```rust
// In error.rs, add variant:
#[error("mfa required")]
MfaRequired { mfa_token: String },
// Maps to 401 with body: { "mfa_required": true, "mfa_token": "..." }
```

### 4. Add config for MFA encryption key

```rust
// config.rs — add:
pub mfa_secret_key: String,  // env MFA_SECRET_KEY, 32-byte hex for AES-256-GCM
```

### 5. Create MFA service (`services/mfa_service.rs`)

Key functions:
```rust
pub async fn setup_totp(db, config, user_id) -> Result<TotpSetupResponse>
// 1. Check no existing verified TOTP for user
// 2. Generate 160-bit random secret
// 3. Create TOTP with: SHA1, 6 digits, 30s, issuer="Vaultic"
// 4. Generate QR code (totp.get_qr_base64())
// 5. Encrypt secret with AES-256-GCM(mfa_secret_key)
// 6. Upsert mfa_methods row (method_type="totp", verified_at=NULL)
// 7. Return secret + QR + otpauth URL

pub async fn verify_totp(db, config, user_id, code) -> Result<Vec<String>>
// 1. Load mfa_method where user_id + method_type="totp"
// 2. Decrypt secret
// 3. Validate code with ±1 step tolerance (skew=1)
// 4. Set verified_at = now(), user.mfa_enabled = true
// 5. Generate + store recovery codes (delegate to recovery service)
// 6. Return plaintext recovery codes (one-time display)

pub async fn validate_totp_login(db, config, mfa_token, code) -> Result<(String,String,Uuid)>
// 1. Decode mfa_token JWT → get user_id
// 2. Load + decrypt TOTP secret
// 3. Validate code
// 4. Issue access_token + refresh_token

pub async fn disable_totp(db, config, user_id, code) -> Result<()>
// 1. Validate current code first
// 2. Delete mfa_methods row
// 3. Delete recovery_codes for user
// 4. Set user.mfa_enabled = false (if no other MFA methods remain)

fn encrypt_secret(plaintext, key) -> String  // AES-256-GCM encrypt
fn decrypt_secret(ciphertext, key) -> String // AES-256-GCM decrypt
```

### 6. Modify login flow (`services/auth_service.rs`)

After password verification, check `user.mfa_enabled`:
```rust
if user.mfa_enabled {
    let mfa_token = create_token(&user.id, "mfa", 300, config)?; // 5min TTL
    return Err(AppError::MfaRequired { mfa_token });
}
// else: proceed with normal token issuance
```

### 7. Create handlers (`handlers/mfa.rs`)

```rust
pub async fn setup_totp(State(state), auth: AuthUser) -> Result<Json<TotpSetupResponse>>
pub async fn verify_totp(State(state), auth: AuthUser, Json(req)) -> Result<Json<TotpVerifyResponse>>
pub async fn validate_totp(State(state), Json(req)) -> Result<Json<AuthResponse>>  // no AuthUser — uses mfa_token
pub async fn disable_totp(State(state), auth: AuthUser, Json(req)) -> Result<Json<Value>>
```

### 8. Register routes (`router.rs`)

```rust
let mfa_routes = Router::new()
    .route("/totp/setup", post(handlers::mfa::setup_totp))
    .route("/totp/verify", post(handlers::mfa::verify_totp))
    .route("/totp/disable", post(handlers::mfa::disable_totp));

let mfa_public_routes = Router::new()
    .route("/totp/validate", post(handlers::mfa::validate_totp));

// Nest under /api/auth/mfa
.nest("/api/auth/mfa", mfa_routes)      // requires AuthUser
.nest("/api/auth/mfa", mfa_public_routes) // no auth (uses mfa_token)
```

## Todo

- [ ] Add `totp-rs` + `base64` to Cargo.toml
- [ ] Create `vaultic-types/src/mfa.rs` with request/response types
- [ ] Add `MfaRequired` variant to AppError
- [ ] Add `mfa_secret_key` to AppConfig
- [ ] Create `services/mfa_service.rs` with setup/verify/validate/disable
- [ ] Modify `auth_service::login` to check mfa_enabled
- [ ] Create `handlers/mfa.rs`
- [ ] Register MFA routes in router.rs
- [ ] `cargo build -p vaultic-server` passes
- [ ] Test: setup → verify → login-with-mfa → disable flow

## Success Criteria

- TOTP setup returns valid QR code scannable by Google Authenticator
- Verify confirms setup and returns recovery codes
- Login with MFA-enabled user returns `mfa_required` + `mfa_token`
- Validate with correct TOTP code returns JWT tokens
- Disable removes TOTP and allows password-only login again
- Invalid codes rejected; secret never exposed in logs/responses after setup

## Security Considerations

- TOTP secret encrypted at rest with AES-256-GCM using dedicated key
- `mfa_token` is short-lived (5min) and single-purpose (token_type="mfa")
- TOTP validation uses ±1 step skew (allows 30s clock drift)
- Disable requires current valid TOTP code (prevents unauthorized removal)
- Recovery codes auto-generated on TOTP verify (backup access)
