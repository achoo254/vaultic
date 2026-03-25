# Research: 2FA, WebAuthn Passkeys, & SRP for Vaultic Auth

## 1. TOTP 2FA Implementation

**Recommended Crate:** `totp-rs` (v5.7.0+)

**Key Features:**
- Lightweight, RFC 6238 compliant TOTP generation/verification
- QR code generation via optional `qr` feature (base64 PNG)
- otpauth URL parsing via optional `otpauth` feature
- Serde support for serialization

**Best Practice:** Use SHA1 algorithm (not SHA256/SHA512) — many authenticator apps silently fallback to SHA1, causing mismatches.

**API Design:**
```
POST /auth/2fa/setup          → generate secret + QR code
POST /auth/2fa/verify         → verify TOTP token (6 digits)
POST /auth/2fa/disable        → remove TOTP from account
```

---

## 2. WebAuthn Passkeys

**Recommended Crate:** `webauthn-rs` (official, W3C compliant, SUSE-audited)

**Flow:**
- `start_passkey_registration(user_id, username, display_name)` → challenge
- `finish_passkey_registration()` → store credential
- `start_passkey_authentication()` → challenge
- `finish_passkey_authentication()` → verify

**Advantages:** Phishing-resistant, strong MFA built-in (TouchID, FaceID, Windows Hello, YubiKey, etc.)

**API Design:**
```
POST /auth/passkey/register/start      → attestation challenge
POST /auth/passkey/register/finish     → store credential
POST /auth/passkey/authenticate/start  → assertion challenge
POST /auth/passkey/authenticate/finish → verify + issue JWT
```

---

## 3. SRP (Secure Remote Password)

**Recommended Crate:** `srp` (pure Rust, SHA256/SHA512 agnostic)

**Status:** Not audited independently; use with caution for high-security scenarios.

**Integration Path:**
1. Replace simple password auth with SRP-based key exchange
2. Combine with HKDF (already in Vaultic) to derive encryption keys
3. Use alongside TOTP/WebAuthn as additional factors

**Flow:**
- Client: username + password → SRP verifier (Argon2id + SRP)
- Server: store SRP verifier (N, g, salt)
- Auth: mutual authentication without password transmission

---

## 4. Recovery Codes (Backup Codes)

**Pattern:** Single-use, hashed in DB, tracked as used/unused

**Implementation:**
- Generate 10-16 alphanumeric codes (e.g., 8-char codes)
- Hash each with Argon2id before storage
- Track usage: `(user_id, code_hash, used_at, created_at)`
- One-time use: delete after verification

**Database:**
```sql
CREATE TABLE recovery_codes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recovery_codes_user ON recovery_codes(user_id);
```

---

## 5. Multi-Factor Auth Database Schema

**Table: `mfa_methods`**
```sql
CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_type VARCHAR(20) NOT NULL, -- 'totp', 'webauthn', 'recovery'
  secret BYTEA,                      -- encrypted TOTP secret
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  UNIQUE(user_id, method_type)
);

CREATE TABLE webauthn_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  credential_public_key BYTEA NOT NULL, -- encrypted
  sign_count BIGINT NOT NULL DEFAULT 0,
  aaguid UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recovery_codes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Encryption:** TOTP secrets & WebAuthn pubkeys stored encrypted (AES-256-GCM, key derived from server master secret).

---

## 6. Migration Path: Simple Auth → MFA

**Phase 1: Optional MFA (non-breaking)**
- Add MFA tables (above)
- Users can enable TOTP/WebAuthn in Settings (opt-in)
- Login still works with password-only

**Phase 2: SRP (future)**
- Replace password auth with SRP verifier
- Existing passwords: one-time upgrade on next login
- MFA stacking: SRP + TOTP/WebAuthn

**Phase 3: Passkey-primary (aspirational)**
- Passkeys as default auth method
- Password-only accounts deprecated

---

## 7. Security Considerations

| Topic | Requirement |
|-------|-------------|
| TOTP Secrets | Encrypt in DB (AES-256-GCM); never log plaintext |
| WebAuthn Keys | Encrypt pubkey in DB; sign_count prevents cloning |
| Recovery Codes | Hash with Argon2id; one-time use enforced in DB |
| SRP Verifiers | Use strong N (2048+ bits); store salt with verifier |
| Rate Limiting | 5 failed MFA attempts → 15min lockout |
| Audit Logging | Log all MFA setup/removal events |

---

## 8. Recommended Implementation Order

1. **TOTP 2FA first** (simplest, no hardware dependency)
2. **Recovery codes** (required backup for any MFA)
3. **WebAuthn passkeys** (modern, phishing-resistant)
4. **SRP** (long-term password replacement, deferred)

---

## Crate Versions (Current)

| Crate | Version | Features |
|-------|---------|----------|
| `totp-rs` | 5.7.0+ | qr, otpauth, serde_support |
| `webauthn-rs` | 0.4+ | (default) |
| `srp` | 0.6+ | sha2 for hash |
| (existing) `argon2` | 0.5+ | ✓ (already in use) |
| (existing) `aes-gcm` | 0.10+ | ✓ (already in use) |

---

## Unresolved Questions

1. **SRP verifier hashing:** Should SRP verifiers also use Argon2id, or pure hash-based computation?
2. **WebAuthn resident keys:** Support platform authenticators (resident keys) or roaming only?
3. **Recovery code distribution:** Email encrypted codes, or in-app download + print?
4. **Session binding:** Should MFA enforce session pinning (IP/UA change → re-auth)?
5. **Backup passkeys:** Multiple WebAuthn credentials per user or single primary?

---

## Sources

- [totp-rs crate](https://crates.io/crates/totp-rs)
- [totp-rs docs](https://docs.rs/totp-rs)
- [Rust 2FA implementation guide](https://codevoweb.com/rust-implement-2fa-two-factor-authentication/)
- [webauthn-rs docs](https://docs.rs/webauthn-rs/latest/webauthn_rs/)
- [Passkeys with Axum implementation](https://ktaka.blog.ccmp.jp/2025/01/implementing-passkeys-authentication-in-rust-axum.html)
- [srp crate](https://crates.io/crates/srp)
- [srp-rs implementation](https://github.com/sassman/srp6-rs)
- [Supabase MFA guide](https://supabase.com/docs/guides/auth/auth-mfa)
- [WebAuthn & FIDO2 implementation](https://shahbhat.medium.com/implementing-fido-and-webauthn-based-multi-factor-authentication-2c86b09ba8a0)
