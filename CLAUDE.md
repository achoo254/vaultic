# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vaultic — open-source, extension-first password manager with zero-knowledge encryption. Targets individuals and small teams as a simpler alternative to 1Password/Bitwarden.

## Agent Protocol

**This project is 100% developed by AI agents. Follow these rules strictly.**

### Mandatory Reading
1. This file (`CLAUDE.md`) — always loaded at session start
2. `docs/agent-rules.md` — MUST read before ANY code implementation
3. `docs/security-policy.md` — MUST read before touching sensitive modules
4. `docs/code-standards.md` — detailed patterns and examples

### Sensitive Modules (require security-policy.md review)
- `backend/src/services/auth-service.ts`, `backend/src/middleware/auth-middleware.ts`
- `backend/src/routes/share-route.ts`, `backend/src/routes/sync-route.ts`
- `client/packages/crypto/src/**` (all encryption/key derivation)
- `client/apps/extension/src/stores/auth-store.ts`, `src/lib/share-crypto.ts`, `src/lib/fetch-with-auth.ts`

### Top 10 Rules
1. MUST read `docs/` before implementation — grep for existing patterns first
2. NEVER create new files if existing file serves same purpose — edit existing
3. NEVER hardcode secrets, URLs, credentials — use environment variables
4. ALL UI must use design tokens from `@vaultic/ui` — never hardcode colors/fonts/spacing
5. ALL icons must use `@tabler/icons-react` with `stroke={1.5}` — never emoji
6. File size limit: 200 lines — modularize if exceeding
7. Cross-package imports: `@vaultic/*` — never relative paths
8. Run `tsc --noEmit` after modifying TypeScript files
9. Conventional commits only — no AI references in messages
10. Security audit required after modifying any sensitive module

## Architecture

Monorepo: pnpm workspace + Turborepo. Backend: Node.js/Express/MongoDB.

```
vaultic/
├── backend/                      # ── NODE.JS/EXPRESS/TYPESCRIPT ──
│   ├── src/
│   │   ├── server.ts             # Express app setup + MongoDB connection
│   │   ├── config/               # Environment variables
│   │   ├── routes/               # API routes (auth, sync, share, health)
│   │   ├── models/               # Mongoose schemas (User, VaultItem, Folder, SecureShare)
│   │   ├── services/             # Business logic (auth, sync, share)
│   │   └── middleware/           # Auth, error handling, rate limiting, logging
│   ├── dist/                     # Compiled JavaScript
│   ├── package.json
│   └── tsconfig.json
├── client/                       # ── CLIENT (TYPESCRIPT) ──
│   ├── apps/
│   │   └── extension/            # WXT browser extension (Chrome MV3)
│   └── packages/
│       ├── api/                  # Server API client (ofetch)
│       ├── crypto/               # WebCrypto bridge (AES-256-GCM, Argon2id, HKDF)
│       ├── storage/              # VaultStore interface + IndexedDB impl
│       ├── sync/                 # Sync engine + conflict resolver
│       └── ui/                   # Shared React components (shadcn/ui)
├── pnpm-workspace.yaml           # Workspace root
├── package.json                  # Root config
└── turbo.json                    # Turborepo config
```

## Tech Stack

| Layer | Tech | Package |
|-------|------|---------|
| Server | Node.js 22 + Express 4 + TypeScript + Mongoose 8 | `backend/` |
| Database | MongoDB (external, connected via MONGODB_URI) | External |
| Crypto (Client) | WebCrypto API + argon2-browser | `client/packages/crypto/` |
| Storage | IndexedDB | `client/packages/storage/` |
| Sync | Delta sync + LWW conflict resolver | `client/packages/sync/` |
| API Client | ofetch | `client/packages/api/` |
| UI | React + Tailwind + shadcn/ui | `client/packages/ui/` |
| Extension | WXT framework (Chrome MV3) | `client/apps/extension/` |
| Deploy | PM2 on CentOS 7 (direct Node.js) | Production |
| Auth | JWT tokens (access 15min, refresh 7d) | Backend |

## Build & Dev Commands

### Backend (Node.js/Express)
```bash
cd backend
pnpm install                         # Install dependencies
pnpm dev                             # Start dev server (tsx watch)
pnpm build                           # Compile TypeScript → dist/
pnpm start                           # Start production server
pnpm start:pm2                       # Start with PM2 (production)
pnpm test                            # Run tests
```

### Client (TypeScript)
```bash
pnpm install                         # Install all dependencies
pnpm dev                             # Dev all client packages (turbo)
pnpm build                           # Build all packages (turbo)
pnpm --filter @vaultic/extension dev # Dev extension only
pnpm --filter @vaultic/crypto build  # Build single package
pnpm --filter @vaultic/ui dev        # Dev shared UI only
pnpm lint                            # Lint all packages
pnpm test                            # Test all packages
```

### Package naming
- Backend: `@vaultic/backend` (scoped in workspace)
- Client: `@vaultic/crypto`, `@vaultic/storage`, `@vaultic/sync`, `@vaultic/api`, `@vaultic/ui`
- Extension: `@vaultic/extension`

### Environment Variables
Backend requires: `MONGODB_URI`, `JWT_SECRET`. See `backend/.env.example`.

## Key Design Decisions

- **Offline-first, user-controlled sync**: All vault CRUD local. Cloud sync is OPT-IN — user toggles it in Settings. Default = offline only, no data on server.
- **No mandatory registration**: Users only need a master password to start. Registration only needed for share + optional sync.
- **Zero-knowledge + zero-cloud by default**: Server never sees plaintext. Server has NO vault data unless user explicitly enables Cloud Sync.
- **Extension-first**: Primary UI is the browser extension (380x520px). Desktop/mobile/web are future phases.
- **WebCrypto over WASM**: Extension uses browser's WebCrypto API for crypto ops — avoids WASM complexity.
- **Delta sync + LWW** (when sync enabled): Devices sync incremental changes. Conflict resolution: last-write-wins by timestamp.
- **Share independent of sync**: Secure Share works as encrypted upload with configurable views/expiry — does NOT require Cloud Sync to be enabled.
- **Sync off → purge option**: When disabling sync, user chooses to delete server data (default) or keep frozen copy.

### Server Role (Minimal)
Server is NOT a traditional CRUD API. It only:
1. **Auth**: register, login, JWT tokens
2. **Sync relay** (opt-in): accept encrypted blobs from push, serve pull deltas — ONLY when user enables Cloud Sync
3. **Share broker**: store/serve encrypted share links (independent of sync)
4. **Purge**: delete user's vault data from server on request

## Crypto Architecture

Client-side encryption flow (Argon2id: 64MB RAM, 3 iterations):
1. **Master password** → Argon2id → master key (32 bytes)
2. **HKDF** derives per-purpose keys (enc key "vaultic-enc", auth key "vaultic-auth")
3. **AES-256-GCM** encrypts each vault item individually (12-byte random nonce)
4. Server stores only ciphertext blobs — cannot decrypt

## Design Style

Swiss Clean Minimal — stroke-based, single blue accent (VIUI Design System).
- Colors: Use `tokens.colors.*` from design system (no hardcoded hex values)
- Font: Inter 400-700, Icons: Tabler (outlined, stroke 1.5)
- Extension size: 380x520px (fixed)
- Design file: `system-design.pen` (use Pencil MCP tools to read)
- Design tokens: `client/packages/ui/src/styles/design-tokens.ts` — ALL UI must use these, never hardcode

## Design Verification

For each screen: read design (`system-design.pen` via Pencil MCP) → implement with design tokens → screenshot → compare → fix until ≥90% match. See `docs/agent-rules.md §7` for full design system compliance rules.

## Environment

- **Dev**: Windows 11 — Node.js 22 + pnpm, MongoDB (external)
- **Prod**: CentOS 7 — PM2 (Node.js backend) + nginx, MongoDB external
- **Source**: https://github.com/achoo254/vaultic
