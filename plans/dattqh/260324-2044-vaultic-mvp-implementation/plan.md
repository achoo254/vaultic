---
status: pending
created: 2026-03-24
project: vaultic
type: implementation
estimated_weeks: 8
---

# Vaultic MVP Implementation Plan

## Overview
Build extension-first password manager with Rust backend, React+TS frontend, zero-knowledge encryption.

## Context
- **Brainstorm:** `../reports/brainstorm-260324-2007-vaultic-password-manager-architecture.md`
- **Research:** `../reports/researcher-260324-2025-vaultic-architecture-research.md`
- **Kaspersky Analysis:** `../reports/researcher-260324-2031-kaspersky-pm-extension-analysis.md`
- **Design File:** `system-design.pen` (25 screens + Navigation Map, Pencil format)

## Design Screens → Phase Mapping

| # | Screen | Phase | Row | Description |
|---|--------|-------|-----|-------------|
| 01 | Register | 4 | Auth | Create account with email + master password |
| 02 | Login | 4 | Auth | Email + master password unlock |
| 03 | Lock Screen | 4 | Auth | Re-enter master password |
| 04 | Empty Vault | 5 | Vault | First-time empty state with CTA |
| 05 | Vault List | 5 | Vault | Main popup: search, suggested, recent, bottom nav |
| 06 | Credential Detail | 5 | Vault | View: username, password (masked), notes, folder |
| 07 | Add / Edit Credential | 5 | Vault | Form: name, URL, username, password+generate, folder |
| 08 | Delete Confirmation | 5 | Tools | Modal dialog for confirming credential deletion |
| 09 | Password Generator | 5 | Tools | Strength bar, length slider, char toggles |
| 10 | Security Health | 8 | Tools | Password health: weak/reused/old counts, score |
| 11 | Autofill Dropdown | 6 | Autofill | Compact overlay on web pages (320x220) |
| 12 | Save Password Banner | 6 | Autofill | Banner prompt to save detected credentials |
| 13 | Share - From Vault | 7 | Share | Toggle "From Vault", credential card, TTL/views |
| 14 | Share - Quick Share | 7 | Share | Toggle "Quick Share", text area, TTL/views |
| 15 | Share - Link Created | 7 | Share | Success: copy link, expiry info, done |
| 16 | Recipient - View Prompt | 7 | Recipient | Web page: warning, "View Credential" button |
| 17 | Recipient - Secret Revealed | 7 | Recipient | Raw text block + copy + disappear warning |
| 17b | Recipient - Credential Revealed | 7 | Recipient | Structured credential view (username/password) |
| 18 | Recipient - Link Expired | 7 | Recipient | Expired/max-views link error page |
| 19 | Settings | 8 | Settings | Security, Data (export/import), Account (logout) |
| 20 | Loading States | 8 | Vault | Skeleton, sync progress, button loading |
| 21 | Error States | 8 | Vault | Network error, wrong password, inline validation, toast |
| 22 | Folder Management | 5 | Tools | List folders, create/rename, item counts |
| 23 | Export Vault | 8 | Settings | Encrypted/CSV format, password, download |
| 24 | Import Passwords | 8 | Settings | Source picker, file upload, CSV/JSON/1pux |

### Design Style
- **Style:** Swiss Clean Minimal — stroke-based, single blue accent
- **Colors:** `#2563EB` primary, `#18181B` text, `#71717A` secondary, `#E4E4E7` borders
- **Typography:** Inter 400-700
- **Icons:** Lucide (outlined)
- **Extension size:** 380x520px

## Key Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Server | Rust (Axum) | Share crypto with desktop later |
| ORM | SeaORM | Faster CRUD dev for solo dev |
| Frontend | React + TypeScript | Share between extension & desktop |
| Extension | WXT framework | Modern, HMR, multi-browser |
| Crypto | Argon2id + AES-256-GCM | Battle-tested, delay SRP to Phase 2 |
| Extension crypto | WebCrypto API | No WASM complexity for MVP |
| DB | PostgreSQL 16 | Docker both dev + prod |
| TLS | rustls (not openssl) | CentOS 7 compat |
| Deploy | Docker on CentOS 7 | Isolate from EOL OS |

## Phases

| # | Phase | Priority | Status | Est. | File |
|---|-------|----------|--------|------|------|
| 1 | Project Setup & Monorepo | Critical | pending | 3d | `phase-01-project-setup.md` |
| 2 | Crypto Core (Rust) | Critical | pending | 4d | `phase-02-crypto-core.md` |
| 3 | API Server & Database | Critical | pending | 5d | `phase-03-api-server-database.md` |
| 4 | Extension Shell & Auth | Critical | pending | 5d | `phase-04-extension-shell-auth.md` |
| 5 | Vault CRUD & Sync | High | pending | 5d | `phase-05-vault-crud-sync.md` |
| 6 | Autofill & Content Script | High | pending | 5d | `phase-06-autofill-content-script.md` |
| 7 | Secure Share | Medium | pending | 4d | `phase-07-secure-share.md` |
| 8 | Polish, CI/CD & Ship | High | pending | 4d | `phase-08-polish-cicd-ship.md` |

## Architecture
```
vaultic/
├── crates/
│   ├── vaultic-crypto/     # Argon2id, AES-256-GCM, HKDF, password gen
│   ├── vaultic-server/     # Axum API + SeaORM + PostgreSQL
│   └── vaultic-types/      # Shared Rust types
├── packages/
│   ├── ui/                 # Shared React components (shadcn/ui)
│   ├── extension/          # WXT browser extension
│   └── shared/             # TS types, API client, WebCrypto bridge
├── docker/
│   ├── Dockerfile          # Multi-stage server build
│   └── docker-compose.yml  # Dev + prod configs
├── Cargo.toml
├── package.json
└── turbo.json
```

## Dependencies
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
                                   ↘                    ↗
                               Phase 7 ──────────────┘
                                          Phase 8 (after all)
```

## Risk Summary
1. Rust learning curve → Start with crypto crate (isolated, testable)
2. CentOS 7 EOL → Docker isolates completely
3. Autofill complexity → Basic form detection first, iterate
4. Solo developer → Strict scope, no feature creep
