# Brainstorm: Backend Stack Decision — Rust vs Node.js

**Date:** 2026-03-25
**Status:** Resolved
**Decision:** Keep Rust + PostgreSQL, leverage AI-assisted development

---

## Problem Statement

Solo developer (experienced Node.js/Mongoose, new to Rust) finding Rust development slow due to learning curve + SeaORM/Axum unfamiliarity. Considering rewrite to Node.js + MongoDB for faster feature shipping. ~10+ new endpoints planned (Team/Org management + 2FA/Passkeys/SRP).

## Current State

| Metric | Value |
|--------|-------|
| Total Rust LOC | ~2,240 / 39 files |
| API Endpoints | 11 (auth:3, sync:3, share:4, health:1) |
| DB Tables | 4 (users, folders, vault_items, secure_shares) |
| Crypto crate | 609 LOC, thin wrappers (aes-gcm, argon2, hkdf) |
| Server crate | ~1,166 LOC |
| Server role | Minimal: auth + sync relay + share broker |

## Evaluated Approaches

### Option A: Node.js + PostgreSQL ❌ Not chosen
- **Pros:** Node.js velocity + correct DB choice, Prisma DX, monorepo consistency
- **Cons:** 1-2 week rewrite cost, lose Rust memory safety, server-side crypto in Node.js
- **Verdict:** Good option but unnecessary given AI-assisted Rust workflow

### Option B: Keep Rust + AI-assisted ✅ Chosen
- **Pros:** Zero rewrite cost, memory safety for password manager, zeroize for keys, code already tested, AI handles 80-90% boilerplate
- **Cons:** Learning curve persists (but manageable with AI), compile time
- **Verdict:** Best balance of security + productivity for security-critical app

### Option C: Node.js + MongoDB ❌ Rejected
- **Pros:** Maximum velocity (most familiar stack)
- **Cons:** Wrong DB for relational data model, no ACID for sync operations, data integrity risks, password manager needs strong consistency
- **Verdict:** **Strongly discouraged** — MongoDB is fundamentally wrong for this use case

## Key Reasoning

1. **Security-critical app** — Password manager handling credentials, encryption keys, team access. Rust's memory safety + zeroize = real security advantage, not just theoretical.
2. **Data model is relational** — Users → Teams → Members → Roles → Shared Vaults → Items. PostgreSQL ACID transactions critical for team permission checks, sync operations, atomic share counting.
3. **AI changes the equation** — With Claude Code writing Rust boilerplate, the "slow to ship" problem is significantly reduced. Developer reviews logic instead of writing syntax.
4. **Upcoming features reinforce Rust** — 2FA/Passkeys/SRP are crypto-heavy. Rust ecosystem (ring, webauthn-rs) is more mature and secure than Node.js equivalents.
5. **Rewrite cost > learning cost** — 2,240 LOC of working, tested code would take 1-2 weeks to rewrite. That time better spent shipping new features.

## Tactics to Reduce Rust Pain

| Pain | Solution |
|------|----------|
| SeaORM unfamiliar | Create CRUD template pattern — copy for each new entity |
| Axum handler boilerplate | Create handler macro/helpers for extract→validate→respond |
| Compile time | `cargo watch -x check`, split workspace, incremental builds |
| Borrow checker | Use `.clone()` freely for MVP, optimize later |
| Don't remember syntax | Delegate to Claude Code, focus on reviewing logic |

## Planned New Features (Scope)

### 1. Team/Org Management (~8-10 endpoints)
- Team CRUD (create, update, delete, list)
- Member management (invite, remove, update role)
- Role-based access (owner, admin, member, viewer)
- Shared vaults (create, assign to team, manage access)

### 2. 2FA / Passkeys / SRP (~5-7 endpoints)
- TOTP setup + verify
- WebAuthn passkey registration + authentication
- SRP protocol (registration + login flow)
- Recovery codes

**Total estimated: ~15 new endpoints**

## Success Metrics

- Ship Team/Org management within target timeline
- No security regressions in existing auth/sync/share
- Developer can add new endpoints without referencing Rust docs for basics
- Test coverage maintained ≥ current level

## Next Steps

1. Create implementation plan for Team/Org + 2FA/Passkeys/SRP
2. Set up CRUD template pattern for rapid endpoint creation
3. Configure `cargo watch` for faster iteration
4. Prioritize feature order based on user demand
