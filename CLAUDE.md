# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vaultic — open-source, extension-first password manager with zero-knowledge encryption. Targets individuals and small teams as a simpler/cheaper alternative to 1Password/Bitwarden.

## Architecture

Monorepo: Cargo workspace (Rust) + Turborepo (pnpm, Node.js). Production-ready modular structure.

```
vaultic/
├── crates/                       # ── RUST ──
│   ├── vaultic-crypto/           # Argon2id, AES-256-GCM, HKDF, password gen
│   ├── vaultic-server/           # Axum API: auth + sync relay + share only
│   ├── vaultic-types/            # Shared Rust types (serde)
│   └── vaultic-migration/        # SeaORM migrations (separate crate)
├── packages/                     # ── TYPESCRIPT ──
│   ├── types/                    # Shared TS types (all platforms)
│   ├── crypto/                   # WebCrypto bridge (all platforms)
│   ├── storage/                  # VaultStore interface + IndexedDB impl
│   ├── sync/                     # Sync engine + conflict resolver
│   ├── api/                      # Server API client (ofetch)
│   ├── ui/                       # Shared React components (shadcn/ui)
│   └── extension/                # WXT browser extension (thin UI layer)
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
├── Cargo.toml                    # Workspace root
├── package.json                  # pnpm workspace root
└── turbo.json                    # Turborepo config
```

### Package Dependency Graph
```
                types
               ╱  │  ╲
             ╱    │    ╲
          crypto  api  storage
             ╲    │    ╱
              sync engine
             ╱    │    ╲
       extension desktop  web    ← Thin UI layers
```

## Tech Stack

| Layer | Tech | Package |
|-------|------|---------|
| Server | Rust (Axum) + SeaORM + PostgreSQL 16 | `crates/vaultic-server/` |
| Crypto (Rust) | Argon2id + AES-256-GCM + HKDF | `crates/vaultic-crypto/` |
| Crypto (TS) | WebCrypto API + argon2-browser | `packages/crypto/` |
| Storage | IndexedDB (ext) / SQLite (desktop) | `packages/storage/` |
| Sync | Delta sync + LWW conflict resolver | `packages/sync/` |
| API Client | ofetch | `packages/api/` |
| Types (TS) | Shared TypeScript types | `packages/types/` |
| UI | React + Tailwind + shadcn/ui | `packages/ui/` |
| Extension | WXT framework (Chrome + Firefox) | `packages/extension/` |
| TLS | rustls (not openssl-sys) | CentOS 7 compat |
| CI/CD | GitLab CI on gitlabs.inet.vn | Self-hosted |
| Container Registry | gitlabs.inet.vn:5050/dattqh/vaultic | |
| Deploy | Docker on CentOS 7 | Isolate from EOL OS |

## Build & Dev Commands

### Rust (crates/)
```bash
cargo build                          # Build all crates
cargo build -p vaultic-crypto        # Build single crate
cargo test                           # Run all Rust tests
cargo test -p vaultic-crypto         # Test single crate
cargo clippy --all-targets           # Lint
cargo fmt --check                    # Format check
cargo run -p vaultic-server          # Run API server
```

### Node.js (packages/)
```bash
pnpm install                         # Install all JS dependencies
pnpm dev                             # Dev all packages (turbo)
pnpm build                           # Build all packages (turbo)
pnpm --filter extension dev          # Dev extension only
pnpm --filter @vaultic/crypto build  # Build single package
pnpm --filter @vaultic/ui dev        # Dev shared UI only
pnpm lint                            # Lint all packages
pnpm test                            # Test all packages
```

### Package naming: `@vaultic/*`
All TS packages use `@vaultic/` scope: `@vaultic/types`, `@vaultic/crypto`, `@vaultic/storage`, `@vaultic/sync`, `@vaultic/api`, `@vaultic/ui`.

### Docker (dev)
```bash
docker compose -f docker/docker-compose.yml up -d postgres   # Start DB only
docker compose -f docker/docker-compose.yml up               # Start all services
```

## Key Design Decisions

- **Offline-first, user-controlled sync**: All vault CRUD local. Cloud sync is OPT-IN — user toggles it in Settings. Default = offline only, no data on server.
- **Mandatory registration**: Users must register (needed for share + optional sync). After first login, vault works 100% offline.
- **Zero-knowledge + zero-cloud by default**: Server never sees plaintext. Server has NO vault data unless user explicitly enables Cloud Sync.
- **Extension-first**: Primary UI is the browser extension (380x520px). Desktop/mobile/web are future phases.
- **WebCrypto over WASM**: Extension uses browser's WebCrypto API for crypto ops — avoids WASM complexity for MVP.
- **Delta sync + LWW** (when sync enabled): Devices sync incremental changes. Conflict resolution: last-write-wins by timestamp.
- **Share independent of sync**: Secure Share works as one-time encrypted upload — does NOT require Cloud Sync to be enabled.
- **Sync off → purge option**: When disabling sync, user chooses to delete server data (default) or keep frozen copy.
- **SRP deferred**: Simple password auth for MVP; Secure Remote Password protocol planned for Phase 2.

### Server Role (Minimal)
Server is NOT a traditional CRUD API. It only:
1. **Auth**: register, login, JWT tokens
2. **Sync relay** (opt-in): accept encrypted blobs from push, serve pull deltas — ONLY when user enables Cloud Sync
3. **Share broker**: store/serve encrypted share links (independent of sync)
4. **Purge**: delete user's vault data from server on request

## Crypto Architecture

Client-side encryption flow:
1. **Master password** → Argon2id → master key
2. **HKDF** derives per-purpose keys (enc key, auth key, etc.)
3. **AES-256-GCM** encrypts each vault item individually
4. Server stores only ciphertext blobs — cannot decrypt

## Design Style

Swiss Clean Minimal — stroke-based, single blue accent.
- Primary: `#2563EB`, Text: `#18181B`, Secondary: `#71717A`, Borders: `#E4E4E7`
- Font: Inter 400-700, Icons: Lucide (outlined, strokeWidth 1.5)
- Extension size: 380x520px (fixed)
- Design file: `system-design.pen` (25 screens, use Pencil MCP tools to read)
- Design tokens: `packages/ui/src/styles/design-tokens.ts` — ALL UI must use these, never hardcode

## Design Verification Protocol (MANDATORY)

For EACH screen implemented:
1. **READ** design via `mcp__pencil__get_screenshot` + `mcp__pencil__batch_get`
2. **IMPLEMENT** using `@vaultic/ui` design tokens
3. **SCREENSHOT** result via browser preview
4. **COMPARE** design vs implementation using vision analysis
5. **FIX** all differences until ≥90% match
6. **DO NOT** proceed to next screen until current passes

Each screen has a verification checklist in its phase file. All checkboxes must be checked.

## Implementation Plan

Located at `plans/dattqh/260324-2044-vaultic-mvp-implementation/plan.md`. Eight phases:
1. Project Setup & Monorepo
2. Crypto Core (Rust)
3. API Server & Database
4. Extension Shell & Auth
5. Vault CRUD & Sync
6. Autofill & Content Script
7. Secure Share
8. Polish, CI/CD & Ship

## Environment

- **Dev**: Windows 11 — native Rust + Node.js toolchain, Docker for PostgreSQL
- **Prod**: CentOS 7 — Docker Compose (server + postgres + nginx)
- **CI/CD**: GitLab CI on gitlabs.inet.vn (self-hosted)
- **Container Registry**: gitlabs.inet.vn:5050/dattqh/vaultic
- **License**: AGPL-3.0
