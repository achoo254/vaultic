---
title: "Team/Org Management + MFA Implementation"
description: "Add TOTP 2FA, WebAuthn passkeys, recovery codes, and team/org management with RBAC to Vaultic backend"
status: pending
priority: P1
effort: 32h
branch: main
tags: [backend, security, mfa, team, rbac]
created: 2026-03-25
---

# Team/Org Management + MFA Implementation Plan

## Overview

Two feature groups for Vaultic backend: (1) MFA — TOTP, recovery codes, WebAuthn passkeys; (2) Team/Org — CRUD, RBAC, invite flow, shared vault items with RSA-OAEP org key wrapping. SRP deferred.

## Phase Order & Dependencies

MFA first (no new crypto model, immediate security value), Team/Org second (complex RSA key wrapping, depends on stable auth).

## Phases

| # | Phase | Est | Status | Depends On |
|---|-------|-----|--------|------------|
| 1 | [MFA Database Schema](phase-01-mfa-database-schema.md) | 2h | pending | - |
| 2 | [TOTP 2FA](phase-02-totp-2fa.md) | 4h | pending | Phase 1 |
| 3 | [Recovery Codes](phase-03-recovery-codes.md) | 3h | pending | Phase 1 |
| 4 | [WebAuthn Passkeys](phase-04-webauthn-passkeys.md) | 5h | pending | Phase 1 |
| 5 | [Team Database Schema](phase-05-team-database-schema.md) | 3h | pending | Phase 1-4 |
| 6 | [Team Org CRUD + RBAC](phase-06-team-org-crud.md) | 5h | pending | Phase 5 |
| 7 | [Team Members & Invites](phase-07-team-members.md) | 5h | pending | Phase 6 |
| 8 | [Shared Vault Items](phase-08-shared-vault-items.md) | 5h | pending | Phase 7 |

## New Dependencies (Cargo)

| Crate | Version | Purpose |
|-------|---------|---------|
| `totp-rs` | 5.7 | TOTP generation/verification, QR codes |
| `webauthn-rs` | 0.5 | WebAuthn/passkey protocol |
| `webauthn-rs-proto` | 0.5 | WebAuthn protocol types |
| `base64` | 0.22 | Encoding for WebAuthn + recovery codes |
| `url` | 2 | WebAuthn relying party origin |

## New API Endpoints (15 total)

**MFA (7):** setup/verify/disable TOTP, generate/verify recovery, register/auth passkeys
**Team (8):** org CRUD (4), member management (4)

## Key Decisions

- TOTP: SHA1 for authenticator app compat
- Recovery codes: 10 codes, 8-char alphanumeric, Argon2id-hashed
- WebAuthn: support platform + roaming authenticators, multiple per user
- Org key: RSA-OAEP wrap per member, server stores only ciphertext
- Invite: shareable code/URL (no SMTP for MVP)
- RBAC: owner > admin > member roles, handler-level checks
- MFA state tracked in login flow via `mfa_required` response field

## Validation Summary

**Validated:** 2026-03-25
**Questions asked:** 6

### Confirmed Decisions
- **RSA Key Infrastructure:** Add RSA key pair gen to registration flow. Client gen keys at register, upload pubkey to server. Needs new Phase 0 or extend Phase 5 with user key migration.
- **WebAuthn Challenge Store:** In-memory HashMap OK for MVP. Single server, restart rare. Redis deferred.
- **Invite Flow:** Keep two-step (accept → admin wraps key → set key). Zero-knowledge compliant. UX handled client-side.
- **MFA Policy:** Optional (opt-in) for all users in MVP. No enforcement for org roles.
- **Audit Logging:** Deferred. YAGNI for MVP.
- **Team Sync:** Extend existing sync engine (/api/sync push/pull). Add org_id filter, no separate endpoint.

### Action Items (Plan Revisions Needed)
- [ ] **CRITICAL:** Add RSA key pair infrastructure to plan — either new Phase 0 or extend Phase 5 migration to add `rsa_public_key` to users table + client-side key generation at registration
- [ ] Phase 8: update sync integration section — confirm extending existing push/pull with org_id filter
- [ ] Phase 5: add `rsa_public_key TEXT` column to users table migration (m20260325_000008 or new migration)
- [ ] Update registration flow (Phase 0 or auth_service) to accept + store RSA public key
