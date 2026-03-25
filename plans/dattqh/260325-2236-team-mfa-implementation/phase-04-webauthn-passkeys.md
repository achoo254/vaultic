---
phase: 4
title: "WebAuthn Passkeys"
status: pending
priority: P1
effort: 5h
depends_on: [1]
---

# Phase 4: WebAuthn Passkeys

## Context
- [Research: 2FA/Passkeys](../reports/researcher-260325-2fa-passkeys-srp.md)
- Entity: `crates/vaultic-server/src/entities/webauthn_credential.rs` (Phase 1)
- `webauthn-rs` handles the W3C WebAuthn protocol; server stores challenges + credentials

## Overview

4 endpoints: register start/finish, authenticate start/finish. Uses `webauthn-rs` crate for challenge generation and verification. Credentials stored in DB. Multiple passkeys per user. Works as MFA method alongside or instead of TOTP.

## Requirements

- Support both platform (TouchID, Windows Hello) and roaming (YubiKey) authenticators
- Multiple passkeys per user (name each for management)
- Registration requires authenticated session (AuthUser)
- Authentication works in MFA login flow (uses mfa_token)
- Challenge state stored server-side (in-memory with TTL for MVP; Redis future)
- Passkey can be primary auth (passwordless) in future — design for it now

## Architecture

### Registration Flow
```
Client → POST /api/auth/mfa/passkey/register/start (AuthUser)
Server → webauthn.start_passkey_registration(user_unique_id, user_name, display_name)
       → store challenge in memory (keyed by user_id, 5min TTL)
       → return CreationChallengeResponse (JSON to client)

Client → navigator.credentials.create(challenge) → credential
Client → POST /api/auth/mfa/passkey/register/finish { credential, name }
Server → webauthn.finish_passkey_registration(credential, stored_challenge)
       → serialize Passkey → store in webauthn_credentials table
       → set mfa_enabled=true, upsert mfa_methods(webauthn)
```

### Authentication Flow
```
Client → POST /api/auth/mfa/passkey/authenticate/start { mfa_token }
Server → load user's credentials → webauthn.start_passkey_authentication(credentials)
       → store challenge in memory
       → return RequestChallengeResponse

Client → navigator.credentials.get(challenge) → assertion
Client → POST /api/auth/mfa/passkey/authenticate/finish { mfa_token, assertion }
Server → webauthn.finish_passkey_authentication(assertion, stored_challenge)
       → update sign_count
       → issue JWT tokens
```

### Challenge Storage (MVP)
```rust
// In-memory HashMap with expiry — good enough for single-server MVP
// Key: user_id (Uuid)
// Value: (PasskeyRegistration | PasskeyAuthentication, Instant)
// Cleanup: lazy expiry check on access
```

## Related Code Files

### Modify
- `crates/vaultic-server/Cargo.toml` — add `webauthn-rs`, `webauthn-rs-proto`, `url`
- `crates/vaultic-server/src/main.rs` — add `Webauthn` instance to AppState
- `crates/vaultic-server/src/router.rs` — add passkey routes
- `crates/vaultic-server/src/handlers/mfa.rs` — add passkey handlers
- `crates/vaultic-server/src/config.rs` — add `webauthn_rp_id`, `webauthn_rp_origin`
- `crates/vaultic-types/src/mfa.rs` — add passkey types

### Create
- `crates/vaultic-server/src/services/webauthn_service.rs`
- `crates/vaultic-server/src/state/challenge_store.rs` — in-memory challenge cache

## Implementation Steps

### 1. Add dependencies

```toml
# Cargo.toml
webauthn-rs = { version = "0.5", features = ["danger-allow-state-serialisation"] }
webauthn-rs-proto = "0.5"
url = "2"
```

Note: `danger-allow-state-serialisation` needed to serialize challenge state. Safe for server-side storage.

### 2. Add config vars

```rust
// config.rs
pub webauthn_rp_id: String,     // env WEBAUTHN_RP_ID, e.g. "vaultic.app"
pub webauthn_rp_origin: String, // env WEBAUTHN_RP_ORIGIN, e.g. "https://vaultic.app"
```

### 3. Create challenge store (`state/challenge_store.rs`)

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};
use uuid::Uuid;
use webauthn_rs::prelude::*;

const CHALLENGE_TTL: Duration = Duration::from_secs(300); // 5min

pub enum ChallengeState {
    Registration(PasskeyRegistration),
    Authentication(PasskeyAuthentication),
}

#[derive(Clone)]
pub struct ChallengeStore {
    inner: Arc<RwLock<HashMap<Uuid, (ChallengeState, Instant)>>>,
}

impl ChallengeStore {
    pub fn new() -> Self { ... }
    pub async fn insert(&self, user_id: Uuid, state: ChallengeState) { ... }
    pub async fn take(&self, user_id: Uuid) -> Option<ChallengeState> {
        // Remove and return if not expired; None if missing/expired
    }
}
```

### 4. Add Webauthn + ChallengeStore to AppState

```rust
// main.rs
pub struct AppState {
    pub db: DatabaseConnection,
    pub config: AppConfig,
    pub webauthn: Arc<Webauthn>,
    pub challenges: ChallengeStore,
}

// Initialize:
let rp_id = config.webauthn_rp_id.clone();
let rp_origin = Url::parse(&config.webauthn_rp_origin)?;
let webauthn = Arc::new(WebauthnBuilder::new(&rp_id, &rp_origin)?.build()?);
```

### 5. Create WebAuthn service (`services/webauthn_service.rs`)

```rust
pub async fn start_registration(state, user_id, user_email)
    -> Result<CreationChallengeResponse>
// 1. Load existing credentials for user (exclude list)
// 2. webauthn.start_passkey_registration(user_id, &email, &email, exclude)
// 3. Store PasskeyRegistration in challenge_store
// 4. Return CreationChallengeResponse

pub async fn finish_registration(state, user_id, credential, name)
    -> Result<()>
// 1. Take PasskeyRegistration from challenge_store
// 2. webauthn.finish_passkey_registration(credential, &reg_state)
// 3. Serialize Passkey to JSON → store in webauthn_credentials
// 4. Upsert mfa_methods(user_id, "webauthn")
// 5. Set user.mfa_enabled = true

pub async fn start_authentication(state, user_id)
    -> Result<RequestChallengeResponse>
// 1. Load all Passkey structs for user (deserialize from DB)
// 2. webauthn.start_passkey_authentication(&passkeys)
// 3. Store PasskeyAuthentication in challenge_store
// 4. Return RequestChallengeResponse

pub async fn finish_authentication(state, config, mfa_token, credential)
    -> Result<(String, String, Uuid)>
// 1. Decode mfa_token → user_id
// 2. Take PasskeyAuthentication from challenge_store
// 3. webauthn.finish_passkey_authentication(credential, &auth_state)
// 4. Update sign_count in DB for matched credential
// 5. Issue access_token + refresh_token
```

### 6. Add passkey types (`vaultic-types/src/mfa.rs`)

```rust
pub struct PasskeyRegisterStartResponse {
    pub challenge: serde_json::Value, // CreationChallengeResponse serialized
}
pub struct PasskeyRegisterFinishRequest {
    pub credential: serde_json::Value, // RegisterPublicKeyCredential
    pub name: Option<String>,
}
pub struct PasskeyAuthStartRequest {
    pub mfa_token: String,
}
pub struct PasskeyAuthStartResponse {
    pub challenge: serde_json::Value, // RequestChallengeResponse serialized
}
pub struct PasskeyAuthFinishRequest {
    pub mfa_token: String,
    pub credential: serde_json::Value, // PublicKeyCredential
}
pub struct PasskeyListResponse {
    pub passkeys: Vec<PasskeyInfo>,
}
pub struct PasskeyInfo {
    pub id: Uuid,
    pub name: Option<String>,
    pub created_at: String,
}
```

### 7. Add handlers (`handlers/mfa.rs`)

```rust
pub async fn passkey_register_start(State(state), auth: AuthUser) -> Result<Json<Value>>
pub async fn passkey_register_finish(State(state), auth: AuthUser, Json(req)) -> Result<Json<Value>>
pub async fn passkey_auth_start(State(state), Json(req)) -> Result<Json<Value>>  // uses mfa_token
pub async fn passkey_auth_finish(State(state), Json(req)) -> Result<Json<AuthResponse>>
pub async fn passkey_list(State(state), auth: AuthUser) -> Result<Json<PasskeyListResponse>>
pub async fn passkey_delete(State(state), auth: AuthUser, Path(id)) -> Result<Json<Value>>
```

### 8. Register routes

```rust
// Auth-required passkey routes:
.route("/passkey/register/start", post(handlers::mfa::passkey_register_start))
.route("/passkey/register/finish", post(handlers::mfa::passkey_register_finish))
.route("/passkey/list", get(handlers::mfa::passkey_list))
.route("/passkey/{id}", delete(handlers::mfa::passkey_delete))

// Public passkey routes (uses mfa_token):
.route("/passkey/authenticate/start", post(handlers::mfa::passkey_auth_start))
.route("/passkey/authenticate/finish", post(handlers::mfa::passkey_auth_finish))
```

## Todo

- [ ] Add `webauthn-rs`, `webauthn-rs-proto`, `url` to Cargo.toml
- [ ] Add WebAuthn config vars (rp_id, rp_origin)
- [ ] Create `state/challenge_store.rs`
- [ ] Add `Webauthn` + `ChallengeStore` to AppState
- [ ] Create `services/webauthn_service.rs`
- [ ] Add passkey types to `vaultic-types/src/mfa.rs`
- [ ] Add passkey handlers to `handlers/mfa.rs`
- [ ] Register passkey routes
- [ ] `cargo build -p vaultic-server` passes
- [ ] Test: register passkey → authenticate with passkey

## Success Criteria

- Registration returns valid WebAuthn challenge parseable by browser
- Finish registration stores credential in DB
- Authentication challenge references stored credentials
- Finish authentication validates signature + updates sign_count
- Multiple passkeys per user supported
- Delete passkey works; if last MFA method, mfa_enabled set false

## Security Considerations

- Challenge state expires after 5min — prevents replay
- `take` semantics: challenge consumed on use, cannot be replayed
- sign_count monotonically increasing — detects credential cloning
- Credentials stored as serialized JSON (public key only, not secret)
- Exclude list during registration prevents duplicate credential creation
- Passkey delete checks ownership (user_id match)
