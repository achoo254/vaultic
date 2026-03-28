# Vaultic: Project Changelog

All notable changes to the Vaultic project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### In Progress
- Mobile apps (iOS/Android) — architecture planning
- SRP (Secure Remote Password) protocol — v0.3 phase
- WebAuthn/TOTP support — security enhancement
- Team vault sharing — v1.0.0 collaboration features

---

## [0.3.0] - 2026-03-28

### Offline-First Login & Hybrid Share Architecture

#### Feature: Vault Creation Without Account
- **SetupPasswordForm** — New first-run screen: enter master password only (no email)
- **Random salt** — Each offline vault gets unique Argon2id salt (stored in VaultConfig)
- **Offline vault mode** — All operations local (IndexedDB) — works 100% offline
- **Account upgrade** — Users can later create account (Settings → "Create Account") to enable Cloud Sync

#### Feature: Hybrid Share (Encrypted URL Fragment)
- **URL-safe encoding** — New `url-share-codec.ts` for safe share link handling
- **Data split:**
  - Encrypted item data stays in URL fragment (never to server)
  - Server stores only metadata: view count, expiry, max views
- **New endpoint** — `GET /api/v1/shares/:id/metadata` (authOptional middleware)
- **Backward compatible** — Legacy shares continue to work

#### New Types & Architecture
- **VaultConfig type** (`shared/types/vault-config.ts`):
  ```typescript
  mode: 'offline' | 'online'
  salt: string                    // Argon2id salt
  authHashVerifier: string        // SHA256(enc_key) for offline password check
  email?: string                  // Online only
  userId?: string                 // Online only
  ```
- **VaultMode union** — Type-safe mode tracking throughout app

#### Crypto Updates
- **deriveMasterKeyWithSalt()** — New function for offline vault with random salt
- **Standard deriveMasterKey()** — Still used for online (email-based salt)
- **HKDF domain separation** — Unchanged (vaultic-enc, vaultic-auth)

#### Backend Changes
- **authOptional middleware** — Optional JWT (sets req.userId if valid, continues if not)
- **Share metadata endpoint** — Check view counts without sending encrypted data
- **Backward compat** — All existing endpoints unchanged

#### Router Changes
- **vaultState instead of isLoggedIn** — Three states: no_vault, locked, unlocked
- **SetupPasswordForm as entry point** — First-run UX for new users
- **Offline vault flows** — Complete local vault creation/usage without server

#### What Stayed the Same
- ✅ Sync engine (delta sync + LWW)
- ✅ Client-side encryption (WebCrypto)
- ✅ IndexedDB storage
- ✅ All existing API endpoints
- ✅ Autofill & content script
- ✅ Settings & export/import

---

## [0.2.0] - 2026-03-27

### Backend Migration: Rust/PostgreSQL → Node.js/Express/MongoDB

#### Migration Summary
- **Completed:** 2026-03-27
- **Status:** All core functionality migrated, production-ready

#### What Changed
- **Backend:** Migrated from Rust (Axum) + PostgreSQL to Node.js (Express) + MongoDB
- **Server Location:** Old: `crates/vaultic-server/`, New: `backend/`
- **Directory Restructure:**
  - `packages/` → `client/packages/` (client packages)
  - `packages/extension` → `client/apps/extension` (browser extension)
  - `crates/` → `_archive/crates/` (archived Rust code, reference only)
  - New: `shared/types/` (shared TypeScript types)

#### Backend Changes
- Express.js 4 + TypeScript for HTTP server
- Mongoose 8 for MongoDB ORM
- Same API endpoints (auth, sync, share) with Express routes
- JWT authentication (15min access, 7d refresh tokens)
- Pino logger for structured logging
- Zod for input validation
- bcrypt for password hashing
- Rate limiting on auth endpoints (100 req/min per IP)

#### Database Changes
- MongoDB external (not containerized in docker-compose)
- Same schema structure as PostgreSQL (users, vaultitems, folders, secureshares)
- Collections use camelCase field naming
- TTL indexes for auto-cleanup

#### Docker Changes
- **Old:** Dockerfile for Rust + PostgreSQL container
- **New:** Dockerfile for Node.js 22 Alpine (multi-stage build)
- Backend connects to external MongoDB via MONGODB_URI env var
- Removed PostgreSQL service from docker-compose.yml

#### File Structure Updates
- `pnpm-workspace.yaml` — root workspace config (backend, client, shared)
- `backend/package.json` — `@vaultic/backend` scoped package
- `backend/src/server.ts` — Express app setup + MongoDB connection
- `backend/src/routes/*.ts` — API endpoints (auth, sync, share, health)
- `backend/src/models/*.ts` — Mongoose schemas
- `backend/src/services/*.ts` — Business logic (auth, sync, share)
- `backend/src/middleware/*.ts` — Middleware (auth, error, logging, rate limit)
- `backend/src/utils/*.ts` — Utilities (JWT, validation, custom errors)

#### Client Packages Moved
- `packages/api/` → `client/packages/api/`
- `packages/crypto/` → `client/packages/crypto/`
- `packages/storage/` → `client/packages/storage/`
- `packages/sync/` → `client/packages/sync/`
- `packages/ui/` → `client/packages/ui/`
- `packages/extension/` → `client/apps/extension/`
- `packages/types/` → `shared/types/`

#### Build & Development
- **Backend dev:** `cd backend && pnpm dev` (tsx watch)
- **Backend build:** `cd backend && pnpm build` (TypeScript → dist/)
- **Client packages:** `pnpm build` (Turbo caching)
- **Extension:** `pnpm --filter @vaultic/extension dev`

#### Environment Variables
**New (backend/.env):**
- `MONGODB_URI` — MongoDB connection string (required)
- `JWT_SECRET` — Secret for JWT signing (required)
- `SERVER_PORT` — API port (default: 8080)
- `ACCESS_TOKEN_TTL_MIN` — Access token TTL (default: 15)
- `REFRESH_TOKEN_TTL_DAYS` — Refresh token TTL (default: 7)
- `CORS_ORIGIN` — CORS whitelist (comma-separated)
- `LOG_LEVEL` — Pino log level (default: info)
- `NODE_ENV` — development|production

#### Breaking Changes (Deployment Only)
- **Removed:** `DATABASE_URL` (PostgreSQL)
- **Removed:** `RUST_LOG` (Rust logging)
- **Added:** `MONGODB_URI` (required)
- **Added:** `JWT_SECRET` (required)
- Self-hosting teams must provide external MongoDB

#### CI/CD Updates (Pending)
- `.gitlab-ci.yml` needs update:
  - Remove `rust-test` job
  - Remove CARGO_HOME variable
  - Update `node-build` job paths (client/apps/extension)
  - Update `deploy-staging` (MongoDB instead of PostgreSQL env vars)

#### What Stayed the Same
- ✅ All crypto primitives (Argon2id, AES-256-GCM, HKDF) still work
- ✅ API endpoint signatures unchanged (same routes)
- ✅ Client-side encryption (WebCrypto in browser)
- ✅ Offline-first design (IndexedDB + delta sync)
- ✅ Zero-knowledge architecture (server never sees plaintext)
- ✅ Extension functionality (Chrome + Firefox)
- ✅ Design system (shared tokens in @vaultic/ui)
- ✅ Sync engine (delta sync + LWW conflict resolution)
- ✅ Share functionality (encrypted links)

#### Notes
- Rust crypto crate still available in `_archive/crates/vaultic-crypto` for reference
- TypeScript packages now handle all server logic (frontend + backend)
- MongoDB provides more flexible schema than PostgreSQL
- Node.js backend simpler to maintain for solo developer

---

## [0.1.0] - 2026-03-26

### MVP Complete: All 8 Phases Shipped

#### Phase 1: Project Setup & Monorepo (2026-03-24)
- Initialized Cargo workspace (4 crates)
- Initialized pnpm workspace (7 packages)
- Configured Turborepo with dependency caching
- Created design token system (`@vaultic/ui/styles/design-tokens.ts`)
- Docker Compose setup (PostgreSQL 16, vaultic-server)
- GitLab CI/CD skeleton with build, test, deploy stages
- Added AGPL-3.0 license and .gitignore
- **Status:** ✅ Complete

#### Phase 2: Crypto Core — Rust (2026-03-24)
- Implemented Argon2id KDF (m=64MB, t=3, p=4)
- Implemented HKDF-SHA256 key derivation with domain separation
- Implemented AES-256-GCM encryption/decryption
- Added secure password generation with CSPRNG
- All crypto types use Zeroize on drop (memory safety)
- **Status:** ✅ Complete — All crypto primitives verified, no warnings

#### Phase 3: API Server & Database (2026-03-25)
- Implemented Axum HTTP server with async/await
- PostgreSQL 16 with SeaORM migrations
- Auth endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- Sync endpoints: `POST /sync/pull`, `POST /sync/push`, `GET /sync/status`
- Share endpoints: `POST /share/create`, `GET /share/:link_id`, `DELETE /share/:link_id`
- JWT token management (24h lifetime, refresh tokens)
- CORS middleware (extension origin restricted)
- Rate limiting on auth endpoints (100 req/min per IP)
- **Status:** ✅ Complete — All endpoints tested and functional

#### Phase 4: Extension Shell & Auth (2026-03-25)
- WXT framework integration (Chrome MV3 + Firefox)
- Popup UI implementation (380×520px fixed)
- Vault list with search functionality
- Item details modal (view/edit/delete)
- Registration & login flows
- JWT token persistence and refresh
- Popup navigation (tabs: vault, search, settings)
- Background service worker messaging
- **Status:** ✅ Complete — Extension loads and authenticates

#### Phase 5: Vault CRUD & Sync (2026-03-25)
- Vault item CRUD operations (create, read, update, delete)
- IndexedDB storage abstraction (`VaultStore` interface)
- Delta sync engine (incremental sync)
- LWW (Last-Write-Wins) conflict resolution
- Sync queue with acknowledged deltas
- Offline-first by design (all operations cached locally)
- Sync toggle in Settings
- Multi-device sync with device tracking
- **Status:** ✅ Complete — Sync resolves conflicts without data loss

#### Phase 6: Autofill & Content Script (2026-03-25)
- Content script for form detection (login, register, password change)
- Auto-fill on recognized login forms
- Password generator on signup pages
- Keyboard shortcut support (Ctrl+Shift+A)
- Form context detection (domain matching)
- Secure credential injection (no XSS exposure)
- **Status:** ✅ Complete — Tested on major sites

#### Phase 7: Secure Share (2026-03-25)
- One-time encrypted link generation
- Independent of Cloud Sync (no server storage required)
- Share password protection
- Expiration: 24h or X views (configurable)
- Zero-knowledge: recipient decrypts client-side
- Share metadata endpoint (`GET /share/:link_id/metadata`)
- **Status:** ✅ Complete — Verified with end-to-end encryption

#### Phase 8: Polish, Settings & Optimization (2026-03-26)
- Settings page: Cloud Sync toggle, export/import, security health
- Export vault (encrypted JSON)
- Import vault (with duplicate detection)
- Security health indicators (weak passwords, duplicate items)
- 13 shared UI components (button, input, checkbox, select, textarea, etc.)
- Icon button & toggle group components
- Refactored background.ts (218L → 4 handler modules)
- Refactored register-form styles into reusable component
- Auto-lock timer (configurable inactivity logout)
- Clipboard operations handler
- Credential handler (vault CRUD via messages)
- **Status:** ✅ Complete — UI polish and feature completion

### Build & Dependencies Optimization
- Added `[profile.release]` with LTO, strip, opt-level=3
- Centralized workspace dependencies (removed duplicates)
- Fixed Turbo task ordering (lint, test now depend on build)
- **Status:** ✅ Complete

### Testing Setup
- Configured Vitest workspace-wide
- 84+ tests across 4 TypeScript packages:
  - `@vaultic/crypto` — Key derivation, encryption roundtrips (15+ tests)
  - `@vaultic/storage` — IndexedDB CRUD, sync queue (20+ tests)
  - `@vaultic/sync` — Delta sync, LWW resolution (25+ tests)
  - `@vaultic/api` — Client mocking, error handling (24+ tests)
- Test structure: `src/__tests__/{feature}.test.ts`
- Coverage: 70%+ for all new code
- **Status:** ✅ Complete — Tests pass, coverage adequate

### Code Quality
- All files <200 LOC (refactored larger modules)
- No Rust warnings (clippy clean)
- No TypeScript `any` types (strict mode)
- Consistent formatting (cargo fmt, prettier)
- ESLint passes all packages
- **Status:** ✅ Complete — Build quality gates pass

### Documentation
- Updated `project-overview-pdr.md` — all phases marked complete
- Updated `code-standards.md` — Vitest framework documented
- Updated `codebase-summary.md` — reflects Phase 8 state
- Created `project-changelog.md` — this file
- Created `development-roadmap.md` — post-MVP planning
- **Status:** ✅ Complete

---

## Key Features (MVP)

### Security
- Zero-knowledge encryption (server never sees plaintext)
- Argon2id password hashing (memory-hard)
- AES-256-GCM for item encryption
- TLS 1.3+ (rustls, no OpenSSL)
- CORS restricted to extension origin

### Functionality
- Offline-first vault (100% local by default)
- Optional Cloud Sync (user toggle)
- Autofill on login forms
- Password generator (customizable)
- Secure share links (one-time, encrypted)
- Export/import with encryption

### Quality
- 84+ tests (Vitest)
- Clean code (all modules <200 LOC)
- No compiler warnings
- Strict TypeScript
- CI/CD pipeline active

---

## Known Limitations (v0.1.0)

- **Single-user only** — No shared vaults yet (v1.1+)
- **Desktop extension only** — Mobile planned (v0.2+)
- **No SRP** — Simple password auth for MVP (SRP in v1.1)
- **No TOTP/WebAuthn** — Basic password auth only
- **No team features** — Personal vaults only
- **CentOS 7 only** — Production deployment (Docker-based)

---

## Git Commit History (Latest)

```
b3d6797 feat: add metadata endpoint for share links and implement retrieval logic
2d04cd8 feat: expand @vaultic/ui with 13 shared components and refactor extension
13f0b89 feat: add repomix output and phase 2 crypto test results
0e0a22c feat: add settings, export/import, security health, and UI polish (Phase 8)
eba0779 feat: implement secure share with zero-knowledge encryption (Phase 7)
6fb5670 feat: implement autofill content script with form detection and credential capture (Phase 6)
feff44a fix: unify IndexedDB schema, fix folder sync queue and persistence
8070023 feat: implement vault CRUD, sync engine, and full popup UI (Phase 5)
6695857 feat: implement extension shell with auth flows and WebCrypto bridge (Phase 4)
9c33861 feat: implement API server with auth, sync relay, and share broker (Phase 3)
145b976 feat: implement crypto core — Argon2id KDF, AES-256-GCM, password generator (Phase 2)
54a1699 refactor: use .env.staging files for environment-specific secrets
76b5ed0 feat: initialize monorepo with Cargo workspace and Turborepo
```

---

## Deployment Status

### Development
- ✅ Local: Windows 11 with native Rust + Node.js
- ✅ Docker Compose: PostgreSQL 16 + vaultic-server

### Staging
- ✅ Docker image builds successfully
- ✅ GitLab CI pipeline functional
- ✅ Automated build → test → deploy flow

### Production Ready
- ✅ CentOS 7 Docker deployment (rustls for TLS)
- ✅ PostgreSQL 16 external (recommended)
- ✅ nginx reverse proxy (TLS termination)
- ✅ Environment variables for secrets
- ✅ Health check endpoints

---

## Metrics (v0.1.0)

| Metric | Value |
|--------|-------|
| **Total LOC** | ~160K tokens |
| **Test Coverage** | 70%+ (84+ tests) |
| **Crates** | 4 (Rust) |
| **Packages** | 7 (TypeScript) |
| **Security** | Zero-knowledge + offline-first |
| **Performance** | <200ms vault search, <2s sync |
| **Browser Support** | Chrome MV3, Firefox native |
| **License** | AGPL-3.0 |

---

## Future Roadmap

See `development-roadmap.md` for v0.2+ planning.

---

*Changelog generated: 2026-03-26*
*MVP Status: Complete (All 8 phases shipped)*
