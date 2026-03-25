---
phase: 1
title: "MFA Database Schema"
status: pending
priority: P1
effort: 2h
---

# Phase 1: MFA Database Schema

## Context
- [Research: 2FA/Passkeys/SRP](../reports/researcher-260325-2fa-passkeys-srp.md)
- Migration pattern: `crates/vaultic-migration/src/m20260324_000001_create_users.rs`
- Entity pattern: `crates/vaultic-server/src/entities/user.rs`

## Overview

3 new tables: `mfa_methods` (TOTP tracking), `webauthn_credentials` (passkey storage), `recovery_codes` (backup codes). Plus add `mfa_enabled` + `totp_verified` columns to `users` table for fast login-flow checks.

## Requirements

- `mfa_methods`: tracks which MFA types user has enabled (totp, webauthn)
- `webauthn_credentials`: stores multiple passkey credentials per user
- `recovery_codes`: single-use hashed backup codes
- All FK cascade on user delete
- Encrypted storage for TOTP secrets and WebAuthn public keys

## Architecture

```
users (existing)
  + mfa_enabled: bool (default false)
  |
  +--< mfa_methods (1:many, one per method_type per user)
  +--< webauthn_credentials (1:many, multiple passkeys)
  +--< recovery_codes (1:many, 10 codes per generation)
```

## Related Code Files

### Modify
- `crates/vaultic-migration/src/lib.rs` — register new migrations
- `crates/vaultic-server/src/entities/mod.rs` — export new entities
- `crates/vaultic-server/src/entities/user.rs` — add relations

### Create
- `crates/vaultic-migration/src/m20260325_000005_create_mfa_methods.rs`
- `crates/vaultic-migration/src/m20260325_000006_create_webauthn_credentials.rs`
- `crates/vaultic-migration/src/m20260325_000007_create_recovery_codes.rs`
- `crates/vaultic-migration/src/m20260325_000008_add_mfa_enabled_to_users.rs`
- `crates/vaultic-server/src/entities/mfa_method.rs`
- `crates/vaultic-server/src/entities/webauthn_credential.rs`
- `crates/vaultic-server/src/entities/recovery_code.rs`

## Implementation Steps

### 1. Migration: mfa_methods table

```rust
// m20260325_000005_create_mfa_methods.rs
#[derive(DeriveIden)]
pub enum MfaMethods {
    Table, Id, UserId, MethodType, EncryptedSecret,
    CreatedAt, VerifiedAt,
}

// Columns:
// id UUID PK default gen_random_uuid()
// user_id UUID NOT NULL FK→users ON DELETE CASCADE
// method_type VARCHAR(20) NOT NULL — 'totp' or 'webauthn'
// encrypted_secret TEXT — AES-256-GCM encrypted TOTP secret
// created_at TIMESTAMPTZ DEFAULT NOW()
// verified_at TIMESTAMPTZ — NULL until first successful verify
// UNIQUE(user_id, method_type)
```

### 2. Migration: webauthn_credentials table

```rust
// m20260325_000006_create_webauthn_credentials.rs
// id UUID PK
// user_id UUID NOT NULL FK→users ON DELETE CASCADE
// credential_id TEXT NOT NULL UNIQUE — base64-encoded
// credential_data TEXT NOT NULL — JSON serialized Passkey struct
// name VARCHAR(255) — user-friendly label ("MacBook TouchID")
// sign_count BIGINT NOT NULL DEFAULT 0
// created_at TIMESTAMPTZ DEFAULT NOW()
// INDEX(user_id)
```

### 3. Migration: recovery_codes table

```rust
// m20260325_000007_create_recovery_codes.rs
// id UUID PK
// user_id UUID NOT NULL FK→users ON DELETE CASCADE
// code_hash TEXT NOT NULL — Argon2id hash
// used_at TIMESTAMPTZ — NULL if unused
// created_at TIMESTAMPTZ DEFAULT NOW()
// INDEX(user_id)
```

### 4. Migration: add mfa_enabled to users

```rust
// m20260325_000008_add_mfa_enabled_to_users.rs
// ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;
```

### 5. SeaORM entities

Each entity follows `user.rs` pattern: `DeriveEntityModel`, relations, `ActiveModelBehavior`.

`mfa_method.rs`:
```rust
#[sea_orm(table_name = "mfa_methods")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub method_type: String,
    pub encrypted_secret: Option<String>,
    pub created_at: Option<DateTimeWithTimeZone>,
    pub verified_at: Option<DateTimeWithTimeZone>,
}
// Relation: BelongsTo User
```

### 6. Update user entity relations

Add `MfaMethods`, `WebauthnCredentials`, `RecoveryCodes` to user `Relation` enum.

### 7. Register migrations in lib.rs

Add all 4 new migrations to `Migrator::migrations()` vec.

## Todo

- [ ] Create migration m20260325_000005_create_mfa_methods
- [ ] Create migration m20260325_000006_create_webauthn_credentials
- [ ] Create migration m20260325_000007_create_recovery_codes
- [ ] Create migration m20260325_000008_add_mfa_enabled_to_users
- [ ] Create entity mfa_method.rs
- [ ] Create entity webauthn_credential.rs
- [ ] Create entity recovery_code.rs
- [ ] Update entities/mod.rs
- [ ] Update entities/user.rs relations
- [ ] Register migrations in lib.rs
- [ ] Run `cargo build -p vaultic-migration` — verify compiles
- [ ] Run migrations against dev DB

## Success Criteria

- All 4 migrations run without error
- All 3 entities compile with correct relations
- `cargo test -p vaultic-server` passes
- FK cascade: deleting user cascades to mfa/webauthn/recovery rows

## Security Considerations

- TOTP secrets encrypted at rest (AES-256-GCM with server-derived key)
- WebAuthn credential_data stored as serialized JSON (contains public key, not secret)
- Recovery code hashes use Argon2id — resistant to brute force
- `mfa_enabled` flag prevents bypassing MFA check in login flow
