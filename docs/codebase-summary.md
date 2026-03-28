# Vaultic: Codebase Summary

**Last updated: 2026-03-28 | Offline-First Login + Hybrid Share complete**

---

## Codebase Statistics

| Metric | Count |
|--------|-------|
| Total files | 287+ |
| Backend (Node.js) | ~20 files |
| Client (TypeScript) | ~100+ files |
| Tests | 4+ suites |
| CI/CD configs | 1 |

---

## Directory Structure

```
vaultic/
├── _archive/crates/              # Archived Rust code (reference only)
│   ├── vaultic-crypto/           # Argon2id, AES-256-GCM, HKDF
│   ├── vaultic-server/           # OLD: Axum API (replaced by Node.js)
│   ├── vaultic-types/            # OLD: Rust types
│   └── vaultic-migration/        # OLD: SeaORM migrations
│
├── backend/                      # Node.js/Express/TypeScript server
│   ├── src/
│   │   ├── server.ts             # Express app + MongoDB connection
│   │   ├── config/
│   │   │   └── env-config.ts     # Environment variables (MONGODB_URI, JWT_SECRET, etc)
│   │   ├── routes/
│   │   │   ├── auth-route.ts     # POST /register, /login, /refresh, /logout, GET /me
│   │   │   ├── health-route.ts   # GET /health, GET /api/v1
│   │   │   ├── sync-route.ts     # POST /push, /pull; GET /status
│   │   │   └── share-route.ts    # POST /create, GET /:id, DELETE /:id, /metadata
│   │   ├── models/
│   │   │   ├── user-model.ts     # User schema (email, passwordHash, createdAt)
│   │   │   ├── vault-item-model.ts # VaultItem schema (ciphertext, timestamp)
│   │   │   ├── folder-model.ts   # Folder schema (collections)
│   │   │   └── secure-share-model.ts # ShareLink schema (encData, expiresAt)
│   │   ├── services/
│   │   │   ├── auth-service.ts   # Register, login, JWT refresh
│   │   │   ├── sync-service.ts   # Delta sync logic
│   │   │   └── share-service.ts  # Share creation & verification
│   │   ├── middleware/
│   │   │   ├── auth-middleware.ts # JWT token validation
│   │   │   ├── error-handler-middleware.ts
│   │   │   ├── rate-limit-middleware.ts # Auth endpoint protection
│   │   │   └── request-logger-middleware.ts # Pino logging
│   │   ├── utils/
│   │   │   ├── app-error.ts      # Custom error class
│   │   │   ├── jwt-utils.ts      # Token generation & verification
│   │   │   └── validate-request.ts
│   │   ├── types/
│   │   │   └── express.d.ts      # Express request type extensions
│   │   └── static/               # Share page HTML
│   ├── dist/                     # Compiled JavaScript output
│   ├── package.json              # @vaultic/backend scoped package
│   └── tsconfig.json
│
├── client/                       # Client-side TypeScript packages
│   ├── apps/
│   │   └── extension/            # WXT browser extension
│   │       ├── src/
│   │       │   ├── entrypoints/
│   │       │   │   ├── popup/    # 380x520px popup UI
│   │       │   │   │   ├── index.html
│   │       │   │   │   ├── main.tsx
│   │       │   │   │   └── app.tsx
│   │       │   │   ├── background.ts # Service worker
│   │       │   │   └── content.ts    # Form detection (Phase 6)
│   │       │   ├── components/
│   │       │   ├── assets/
│   │       │   └── utils/
│   │       ├── wxt.config.ts
│   │       └── package.json
│   │
│   └── packages/
│       ├── api/                  # @vaultic/api package
│       │   ├── src/
│       │   │   ├── client.ts     # ofetch HTTP client
│       │   │   ├── auth-api.ts   # register, login, refresh
│       │   │   ├── sync-api.ts   # push, pull, status
│       │   │   └── share-api.ts  # create, fetch, delete
│       │   └── package.json
│       │
│       ├── crypto/               # @vaultic/crypto package
│       │   ├── src/
│       │   │   ├── cipher.ts     # AES-256-GCM wrapper (WebCrypto)
│       │   │   ├── kdf.ts        # Argon2id + HKDF (browser)
│       │   │   └── password-gen.ts
│       │   └── package.json
│       │
│       ├── storage/              # @vaultic/storage package
│       │   ├── src/
│       │   │   ├── vault-store.ts # VaultStore interface
│       │   │   ├── indexeddb-store.ts
│       │   │   ├── memory-store.ts # Test store
│       │   │   └── sync-queue.ts
│       │   └── package.json
│       │
│       ├── sync/                 # @vaultic/sync package
│       │   ├── src/
│       │   │   ├── sync-engine.ts # Delta sync coordinator
│       │   │   ├── conflict-resolver.ts # LWW resolution
│       │   │   └── device.ts     # Device tracking
│       │   └── package.json
│       │
│       └── ui/                   # @vaultic/ui package
│           ├── src/
│           │   ├── components/   # 13 shared React components
│           │   │   ├── button.tsx, input.tsx, checkbox.tsx
│           │   │   ├── select.tsx, textarea.tsx, toggle-group.tsx
│           │   │   ├── modal.tsx, card.tsx, stack.tsx, divider.tsx
│           │   │   ├── pill-group.tsx, badge.tsx, section-header.tsx
│           │   │   └── icon-button.tsx
│           │   ├── styles/
│           │   │   └── design-tokens.ts # SINGLE SOURCE OF TRUTH
│           │   └── index.ts
│           └── package.json
│
├── shared/                       # Shared across platforms
│   └── types/                    # @vaultic/types package
│       ├── src/
│       │   ├── user.ts          # User, LoginRequest, LoginResponse
│       │   ├── vault.ts         # VaultItem, VaultItemType
│       │   ├── vault-config.ts  # VaultConfig, VaultMode (offline vs online)
│       │   ├── sync.ts          # Delta, SyncRequest, SyncResponse
│       │   ├── share.ts         # ShareLink, ShareRequest
│       │   └── index.ts
│       └── package.json
│
├── pnpm-workspace.yaml          # Workspace config
├── package.json                 # Root workspace
├── turbo.json                   # Turborepo cache config
├── tsconfig.base.json          # Base TS config
├── Cargo.toml                   # ARCHIVED (workspace disabled)
├── .gitlab-ci.yml              # CI/CD pipeline
└── docs/                        # Documentation
```

---

## Tech Stack

| Layer | Tech | Location |
|-------|------|----------|
| Server | Node.js 22 + Express 4 + TypeScript | `backend/` |
| Database | MongoDB (external, MONGODB_URI) | External |
| Auth | JWT (15min access, 7d refresh) | `backend/services/auth-service.ts` |
| Crypto (Client) | WebCrypto API + argon2-browser | `client/packages/crypto/` |
| Storage | IndexedDB (browser) / SQLite (desktop) | `client/packages/storage/` |
| Sync | Delta sync + LWW conflict resolver | `client/packages/sync/` |
| API Client | ofetch (lightweight) | `client/packages/api/` |
| Types | Shared TypeScript interfaces | `shared/types/` |
| UI | React 18 + Tailwind + shadcn/ui | `client/packages/ui/` |
| Extension | WXT (Chrome MV3 + Firefox) | `client/apps/extension/` |
| Logger | Pino + pino-http | `backend/` |
| Validation | Zod | `backend/` |
| Process Manager | PM2 | Production deployment |
| CI/CD | GitLab CI | Self-hosted |

---

## Backend API Structure

### Routes (Express)
- **POST** `/api/v1/auth/register` — New user registration (also account upgrade from offline)
- **POST** `/api/v1/auth/login` — User login
- **POST** `/api/v1/auth/refresh` — Refresh JWT token
- **POST** `/api/v1/auth/logout` — Logout (token invalidation)
- **GET** `/api/v1/auth/me` — Current user profile (protected)
- **POST** `/api/v1/sync/push` — Push encrypted deltas (protected)
- **POST** `/api/v1/sync/pull` — Fetch deltas (protected)
- **GET** `/api/v1/sync/status` — Sync status (protected)
- **POST** `/api/v1/shares/create` — Generate share link (protected)
- **GET** `/api/v1/shares/:linkId` — Fetch encrypted share (public)
- **GET** `/api/v1/shares/:linkId/metadata` — Share metadata (authOptional, public)
- **DELETE** `/api/v1/shares/:linkId` — Revoke share (protected)
- **GET** `/api/v1` — Health check
- **GET** `/health` — Health probe

### Middleware Stack
1. **CORS** — Restrict to extension origins
2. **JSON/URL-encoded body parser** — 1MB limit
3. **Request logger** — Pino HTTP
4. **Rate limiter** — Auth endpoints (100 req/min per IP)
5. **authRequired()** — JWT validation (protected routes, throws if missing)
6. **authOptional()** — Optional JWT (sets req.userId if valid, continues if not)
7. **Error handler** — Global error catching

**Note:** Share metadata endpoint uses authOptional to allow unauthenticated clients to check view counts.

### Database Models
- **User** — email (unique), passwordHash, createdAt, updatedAt
- **VaultItem** — userId, folderId, ciphertext, timestamp, itemType
- **Folder** — userId, name, parent (collections/nesting)
- **SecureShare** — encData, expiresAt, maxViews, viewCount, accessKey

---

## Client Package Dependencies

```
@vaultic/types
  ├── @vaultic/crypto
  │   └── WebCrypto API, argon2-browser
  ├── @vaultic/api
  │   └── ofetch
  ├── @vaultic/storage
  │   └── IndexedDB (browser)
  └── @vaultic/ui
      └── React, Tailwind CSS

@vaultic/sync
  └── @vaultic/types, @vaultic/storage

@vaultic/extension
  └── WXT, React, @vaultic/*
```

---

## Environment Variables

### Backend (backend/.env)
```
MONGODB_URI=mongodb://...
JWT_SECRET=<random-secret>
SERVER_PORT=8080 (default)
ACCESS_TOKEN_TTL_MIN=15 (default)
REFRESH_TOKEN_TTL_DAYS=7 (default)
CORS_ORIGIN=chrome-extension://*,moz-extension://*
LOG_LEVEL=info (default)
NODE_ENV=development|production
```

---

## Key Design Patterns

### Offline-First (Three Vault States)
- **no_vault** — First run: SetupPasswordForm to create offline vault (no account)
- **locked** — Password protected (inactivity timeout or reload)
- **unlocked** — Vault accessible for read/write
- All vault CRUD local (IndexedDB)
- Server sync optional (Settings toggle)
- Can create account later to enable Cloud Sync

### Zero-Knowledge
- **Offline vault:** Master password (only) → Argon2id + random salt → Master key
- **Online vault:** Master password + email → Argon2id (email as salt) → Master key
- HKDF derives per-purpose encryption keys
- AES-256-GCM encrypts each item individually
- Server stores only ciphertext blobs (never has plaintext)

### Delta Sync (when enabled)
- Client queues changes locally
- Push: send encrypted deltas with timestamp
- Pull: receive deltas, merge with LWW resolution
- Sync state persisted in IndexedDB

### JWT Token Flow
1. Register: hash password, return tokens
2. Login: verify password, return tokens
3. Refresh: validate refresh token, issue new access token
4. Protected routes: extract JWT from Authorization header

---

## Build & Test Commands

### Backend
```bash
cd backend
pnpm install
pnpm dev              # tsx watch (hot reload)
pnpm build            # tsc → dist/
pnpm start            # node dist/server.js
pnpm start:pm2        # PM2 production
```

### Client
```bash
pnpm --filter @vaultic/extension dev  # Hot reload extension
pnpm build                            # Turbo build all
pnpm test                             # Vitest all
pnpm --filter @vaultic/crypto build   # Build single
```

---

## File Size & Modularization

- Backend: ~20 files, each <150 lines (routes, models, services separate)
- Client: ~100 files, organized by package concern
- UI components: Each component <80 lines (design-token driven)
- Services: Single responsibility pattern

---

## Security Notes

- Passwords: bcrypt hashing with salt
- JWT: Signed with HS256 (JWT_SECRET)
- CORS: Restricted to extension origins only
- Rate limiting: Auth endpoints protected
- MongoDB: External (client responsibility)
- TLS: HTTPS required in production (via nginx)
