# Vaultic: Project Overview & PDR

## Vision

**Vaultic** is an open-source, extension-first password manager with zero-knowledge encryption. It targets individuals and small teams as a simpler, cheaper alternative to 1Password and Bitwarden.

**Core principle:** Users control their data. Default = offline-only. Cloud sync is OPT-IN. Server has zero access to plaintext vault data.

---

## Product Development Requirements (PDR)

### Functional Requirements

#### 1. Authentication & Registration
- **FR-1.1:** User registration with email + master password
- **FR-1.2:** Login via email + master password verification
- **FR-1.3:** JWT token management (session lifetime ~24h, refresh tokens)
- **FR-1.4:** Logout + session invalidation
- **FR-1.5:** Password reset via email recovery link
- **Phase 1 Status:** Framework in place. Detailed implementation in Phase 4.

#### 2. Vault CRUD (Create, Read, Update, Delete)
- **FR-2.1:** Create vault items (passwords, notes, payment cards, identities)
- **FR-2.2:** Edit vault items in-place
- **FR-2.3:** Delete vault items (soft-delete with recovery window)
- **FR-2.4:** Search vault by name, URL, or tags
- **FR-2.5:** Organize items into collections/folders
- **Phase 1 Status:** Data model designed in vaultic-types. Implementation in Phase 5.

#### 3. Zero-Knowledge Encryption
- **FR-3.1:** Master password → Argon2id key derivation (email as salt, 64MB, t=3, p=4)
- **FR-3.2:** HKDF-SHA256 per-purpose encryption keys with domain separation
- **FR-3.3:** AES-256-GCM encryption for each vault item (256-bit key, random nonce)
- **FR-3.4:** Server storage: ciphertext only, no plaintext access
- **Phase 2 Status:** Fully implemented. All crypto primitives complete.

#### 4. Cloud Sync (Optional, User-Controlled)
- **FR-4.1:** User toggle for Cloud Sync in Settings
- **FR-4.2:** Incremental delta sync on enable
- **FR-4.3:** Multi-device sync with LWW (last-write-wins) conflict resolution
- **FR-4.4:** Sync off → user choice: purge server data or keep frozen copy
- **Phase 1 Status:** Sync engine interface designed. Logic in Phase 5.

#### 5. Secure Share
- **FR-5.1:** One-time encrypted link generation for vault items
- **FR-5.2:** Share works independent of Cloud Sync status
- **FR-5.3:** Recipient decrypts via password (no account needed)
- **FR-5.4:** Expiration: 24h or X views (user-configurable)
- **Phase 1 Status:** Type definitions in place. Implementation in Phase 7.

#### 6. Browser Extension
- **FR-6.1:** Auto-fill credentials on login forms
- **FR-6.2:** Content script detects login forms
- **FR-6.3:** Popup UI for vault search and quick access
- **FR-6.4:** Generate strong passwords on signup pages
- **Phase 1 Status:** WXT framework scaffolded. UI in Phases 4–6.

### Non-Functional Requirements

| Requirement | Spec | Phase |
|-------------|------|-------|
| **Security** | No plaintext on server, WebCrypto + Argon2id, no plaintext in transit (HTTPS only) | 2–3 |
| **Performance** | Sub-200ms vault search, <2s sync, <1s form auto-fill | 5–6 |
| **Availability** | Server 99% uptime SLA, graceful offline-first fallback | 3, 8 |
| **Compliance** | AGPL-3.0 license, GDPR-ready (user can request data export) | 1, 8 |
| **Browser Support** | Chrome MV3 + Firefox (native manifest support) | 1, 6 |
| **Crypto Freshness** | TLS 1.3+, rustls (not openssl-sys for CentOS 7 compat) | 3 |

---

## Tech Stack

### Server (Rust)
| Component | Tech | Crate |
|-----------|------|-------|
| Framework | Axum (async HTTP) | vaultic-server |
| Database | SeaORM + PostgreSQL 16 | vaultic-migration |
| Crypto | Argon2id, AES-256-GCM, HKDF | vaultic-crypto |
| TLS | rustls (no openssl-sys) | Axum default |
| Serialization | serde + serde_json | Workspace deps |

### Client (TypeScript)
| Component | Tech | Package |
|-----------|------|---------|
| Crypto (TS) | WebCrypto API + argon2-browser | @vaultic/crypto |
| Storage | IndexedDB (ext) / SQLite (desktop) | @vaultic/storage |
| Sync | Delta sync + LWW conflict resolver | @vaultic/sync |
| API Client | ofetch (lightweight HTTP) | @vaultic/api |
| UI Framework | React 18 + Tailwind CSS | @vaultic/ui |
| Extension | WXT (abstraction over MV3) | @vaultic/extension |
| Types | Shared across platforms | @vaultic/types |

### DevOps
| Component | Tech |
|-----------|------|
| Container Runtime | Docker + Docker Compose |
| Database (Dev) | PostgreSQL 16 in container |
| CI/CD | GitLab CI (self-hosted on gitlabs.inet.vn) |
| Container Registry | gitlabs.inet.vn:5050/dattqh/vaultic |
| Orchestration | Docker Compose on CentOS 7 |
| TLS | rustls, no OpenSSL (CentOS 7 compatibility) |

---

## Architecture Highlights

### Offline-First Design
1. All vault CRUD happens locally (IndexedDB or SQLite)
2. Server sync is opt-in via Settings toggle
3. After first login, vault works 100% offline
4. Devices sync via delta protocol when enabled

### Zero-Knowledge
```
Client                              Server
─────────────────────────────────────────────────
Master Password
    ↓ Argon2id
  Master Key (never sent)
    ↓ HKDF
  {Enc Key, Auth Key, ...}
    ↓ AES-256-GCM per item
  Ciphertext ────────────────────→ Storage (can't decrypt)
```

### Extension-First
- Primary UI: 380×520px fixed popup (Chrome/Firefox)
- Content script: Auto-detects login forms
- Background service worker: Manages encryption, sync, notifications
- Desktop/mobile: Future phases (same sync engine, different UI)

### Monorepo (Cargo + Turborepo)
- **Rust crates** share types via serde
- **TS packages** use TypeScript interfaces + unified @vaultic namespace
- **Shared design tokens** prevent UI/extension drift
- **Turbo caching** speeds dev iteration

---

## Implementation Phases (8-Phase Plan)

| Phase | Name | Duration | Status |
|-------|------|----------|--------|
| 1 | Project Setup & Monorepo | 1d | ✅ Complete |
| 2 | Crypto Core (Rust) | 3d | ✅ Complete |
| 3 | API Server & Database | 4d | Pending |
| 4 | Extension Shell & Auth | 3d | Pending |
| 5 | Vault CRUD & Sync | 5d | Pending |
| 6 | Autofill & Content Script | 4d | Pending |
| 7 | Secure Share | 2d | Pending |
| 8 | Polish, CI/CD & Ship | 3d | Pending |

**Total Estimate:** 25 days of focused development.

---

## Success Metrics

### Phase 1 (Complete)
- ✅ Monorepo compiles (all crates + packages)
- ✅ Docker Compose starts PostgreSQL
- ✅ CI/CD skeleton integrated
- ✅ Design tokens centralized

### Phase 2 (Complete)
- ✅ Argon2id KDF implemented (m=64MB, t=3, p=4)
- ✅ HKDF-SHA256 key derivation with domain separation
- ✅ AES-256-GCM encryption/decryption working
- ✅ Secure password generation with configurable options
- ✅ Type-safe keys with automatic Zeroize on drop
- ✅ All crypto tests pass
- ✅ No warnings from clippy or cargo fmt

### Phase 3 (In Progress)
- API server builds and starts
- Database migrations run without error
- Auth endpoints operational

### Phase 4–6 (Future)
- Extension loads in Chrome/Firefox
- Form auto-fill works on sample login pages
- Sync resolves conflicts without data loss

### Phase 7–8 (Future)
- Secure share links generate and decrypt
- CI/CD deploys to production
- 1.0 release shipped

---

## Design Language

**Swiss Clean Minimal** — stroke-based, single blue accent.

| Property | Value |
|----------|-------|
| Primary Color | #2563EB (blue) |
| Text | #18181B (near-black) |
| Secondary | #71717A (gray) |
| Borders | #E4E4E7 (light gray) |
| Typography | Inter 400–700 |
| Icons | Lucide (outlined, strokeWidth 1.5) |
| Extension | 380×520px fixed (no resize) |

All UI must use design tokens from `packages/ui/src/styles/design-tokens.ts`. No hardcoding colors or sizes.

---

## Deployment Model

### Development
- **Workstation:** Windows 11 with native Rust + Node.js toolchain
- **Database:** PostgreSQL 16 via `docker compose up`
- **Testing:** Local unit tests + integration tests in CI

### Production
- **Server:** CentOS 7 Docker container (rustls for TLS)
- **Database:** PostgreSQL 16 (managed separately or in Docker)
- **Reverse Proxy:** nginx (TLS termination)
- **Deployment:** Docker pull + compose restart
- **CI/CD:** GitLab CI on gitlabs.inet.vn (self-hosted)

---

## Security Considerations

1. **No Plaintext on Server:** All vault data encrypted client-side. Server has zero ability to decrypt.
2. **TLS 1.3+:** rustls enforced (no openssl-sys to avoid CentOS 7 deprecation).
3. **Password Storage:** Argon2id with high work factors (memory cost, parallelism).
4. **Token Management:** Short-lived JWT (24h) with refresh token rotation.
5. **CORS:** Strict origin checks on API (extension origin only).
6. **Content Security Policy:** Strict CSP on extension popup (no inline scripts).

---

## Open Questions & Decisions Deferred

1. **SRP (Secure Remote Password) vs. Simple Auth:** Phase 2 uses simple password auth; SRP protocol planned for Phase 2.1.
2. **Multi-factor Authentication:** Not in MVP; consider Phase 8+ for TOTP/WebAuthn.
3. **Mobile Platforms:** Extension-first MVP targets desktop only. iOS/Android/web planned post-v1.0.
4. **Team Features:** Shared vaults deferred to v1.1+ (current design is single-user first).
5. **Self-hosting:** Full self-hosted deployment docs in Phase 8.

---

## Stakeholders & Roles

| Role | Responsibility | Status |
|------|-----------------|--------|
| **Developer (You)** | Full-stack implementation (Rust + TS) | Active |
| **Designer** | Visual verification via system-design.pen | Reference |
| **CI/CD Admin** | GitLab CI + registry setup | Pre-configured |

---

## References

- **CLAUDE.md** — Project-specific constraints and architecture
- **system-design.pen** — Design system (25 screens)
- **plans/dattqh/260324-2044-vaultic-mvp-implementation/** — Detailed phase plans
- **Cargo.toml, package.json** — Dependency manifests
- **.env.example** — Required environment variables

---

*Document updated: 2026-03-25*
*Phase 1 Status: Complete*
*Phase 2 Status: Complete (Crypto Core)*
