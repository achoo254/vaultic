# Brainstorm: Backend Migration Rust+PostgreSQL → Node.js+MongoDB

**Date:** 2026-03-26
**Status:** Agreed
**Participants:** dattqh + Claude

---

## Problem Statement

Current Rust (Axum) + PostgreSQL backend works but:
- Dev is new to Rust → slow iteration
- CentOS 7 (prod) + CentOS 9 (staging) run Node.js apps via PM2 well
- Team familiar with Node.js/TypeScript ecosystem
- Opportunity to unify monorepo into full TypeScript stack

**Goal:** Replace Rust backend with Node.js + Express + Mongoose. Redesign API. Restructure repo.

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API scope | Redesign (breaking OK) | No prod users, take opportunity |
| Database | MongoDB + Mongoose | Team familiarity, PM2 deploy simplicity |
| Data model | References (separate collections) | Relational-like, clear boundaries |
| Framework | Express.js + TypeScript | Simple, mature, PM2-friendly |
| Repo layout | Flat split (backend/client/shared) | Clear separation for future platforms |
| Rust code | Keep in archive for reference | Don't delete, move to `_archive/crates/` |

---

## Proposed Repo Structure

```
vaultic/
├── backend/                    # NEW: Express + Mongoose
│   ├── src/
│   │   ├── config/             # Environment, DB connection
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── user.model.ts
│   │   │   ├── vault-item.model.ts
│   │   │   ├── folder.model.ts
│   │   │   └── secure-share.model.ts
│   │   ├── routes/             # Express routers
│   │   │   ├── auth.routes.ts
│   │   │   ├── sync.routes.ts
│   │   │   └── share.routes.ts
│   │   ├── services/           # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── sync.service.ts
│   │   │   └── share.service.ts
│   │   ├── middleware/         # Auth, error handling, CORS
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── utils/              # Crypto helpers, validators
│   │   └── app.ts             # Express app setup
│   ├── package.json
│   └── tsconfig.json
├── client/                     # Existing TS packages restructured
│   ├── packages/               # crypto, storage, sync, api, ui
│   ├── apps/                   # extension, web, desktop (future)
│   └── package.json
├── shared/                     # Types shared between backend + client
│   └── types/
│       ├── auth.types.ts
│       ├── vault.types.ts
│       ├── sync.types.ts
│       └── share.types.ts
├── _archive/                   # OLD: Rust code for reference
│   └── crates/
├── docker/
│   ├── docker-compose.dev.yml  # MongoDB + backend dev
│   └── docker-compose.prod.yml
├── package.json                # Root pnpm workspace
└── turbo.json
```

---

## MongoDB Schema Design (References Approach)

### Users Collection
```typescript
{
  _id: ObjectId,
  email: string,          // unique index
  authHash: string,       // HMAC-SHA256(client_hash, secret)
  encryptedSymmetricKey?: string,
  argon2Params?: { m: number, t: number, p: number },
  createdAt: Date,
  updatedAt: Date
}
```

### Folders Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,       // index
  encryptedName: string,
  parentId?: ObjectId,    // self-reference
  deletedAt?: Date,       // soft delete
  createdAt: Date,
  updatedAt: Date
}
```

### VaultItems Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,       // compound index: (userId, updatedAt)
  folderId?: ObjectId,
  itemType: number,       // 0=Login, 1=SecureNote, 2=Card, 3=Identity
  encryptedData: string,
  deviceId: string,       // compound index: (userId, deviceId)
  version: number,
  deletedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### SecureShares Collection
```typescript
{
  _id: string,            // 12-char random alphanumeric (custom)
  vaultItemId: ObjectId,
  userId: ObjectId,
  encryptedData: string,
  maxViews?: number,
  currentViews: number,   // default 0
  expiresAt?: Date,
  accessedAt?: Date,
  createdAt: Date
}
```

---

## Security Parity Checklist

| Rust Feature | Node.js Equivalent | Status |
|---|---|---|
| HMAC-SHA256 (auth hash) | `crypto.createHmac('sha256', secret)` | ✅ 1:1 |
| Constant-time comparison | `crypto.timingSafeEqual()` | ✅ 1:1 |
| JWT (access + refresh) | `jsonwebtoken` package | ✅ 1:1 |
| Atomic view increment | `findOneAndUpdate({ $inc, $lt condition })` | ⚠️ Test race conditions |
| CORS | `cors` middleware | ✅ 1:1 |
| Error types → HTTP codes | Custom error classes + middleware | ✅ Straightforward |

### ⚠️ MongoDB-specific Security Considerations

1. **No FK constraints** → App-level validation on userId ownership before any CRUD
2. **No native transactions (standalone)** → For register, OK (single insert). For sync push with multiple updates, use MongoDB transactions (requires replica set even in dev)
3. **Atomic share view counting** → `findOneAndUpdate` with `$inc` + `$lt` condition works, but different from SQL `UPDATE...RETURNING`. Test thoroughly.
4. **Injection** → Mongoose sanitizes by default, but validate all user input

---

## API Redesign Opportunities

### Current (Rust) → Proposed (Node.js)

| Current | Proposed | Change |
|---------|----------|--------|
| `POST /api/auth/register` | `POST /api/v1/auth/register` | Add API versioning |
| `POST /api/auth/login` | `POST /api/v1/auth/login` | Same |
| `POST /api/auth/refresh` | `POST /api/v1/auth/refresh` | Same |
| `POST /api/sync/push` | `POST /api/v1/sync/push` | Add request validation (zod) |
| `GET /api/sync/pull` | `GET /api/v1/sync/pull` | Pagination support |
| `DELETE /api/sync/purge` | `DELETE /api/v1/sync/data` | RESTful naming |
| `POST /api/share` | `POST /api/v1/shares` | RESTful plural |
| `GET /api/share/:id` | `GET /api/v1/shares/:id` | Same |
| `GET /api/share/:id/meta` | `GET /api/v1/shares/:id/meta` | Same |
| `DELETE /api/share/:id` | `DELETE /api/v1/shares/:id` | Same |
| `GET /health` | `GET /api/v1/health` | Under api prefix |
| `GET /s/:id` | `GET /s/:id` | Keep as-is (public page) |

**New additions to consider:**
- `GET /api/v1/auth/me` — get current user profile
- `PATCH /api/v1/auth/password` — change password
- Request validation with `zod` on all endpoints
- Rate limiting on auth endpoints

---

## Tech Stack (Backend)

| Concern | Package | Why |
|---------|---------|-----|
| Framework | `express` + `@types/express` | Simple, mature |
| Database | `mongoose` | Team familiar, good TS support |
| Validation | `zod` | Schema validation, type inference |
| Auth | `jsonwebtoken` + `crypto` (builtin) | JWT + HMAC |
| Env | `dotenv` | Simple config |
| Logging | `pino` or `morgan` | Structured logging |
| Process | PM2 | Production process manager |
| TypeScript | `tsx` (dev) + `tsc` (build) | Fast dev, standard build |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| MongoDB race conditions on share views | Medium | Thorough integration tests, `findOneAndUpdate` with conditions |
| No FK → orphan data | Low | Middleware validates userId ownership; cleanup job optional |
| MongoDB replica set needed for transactions | Medium | Use `run-rs` for dev, single replica set for prod |
| Sync LWW logic complexity in MongoDB | Medium | Port Rust logic carefully, test edge cases |
| Shared types drift between backend/client | Low | `shared/types/` package with strict versioning |

---

## Deployment Plan (CentOS 7/9 + PM2)

```
# Production (CentOS 7)
backend/
├── dist/                 # Compiled JS
├── ecosystem.config.js   # PM2 config
└── .env.production

# PM2 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'vaultic-api',
    script: './dist/app.js',
    instances: 2,           // cluster mode
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
}
```

MongoDB có thể chạy trực tiếp trên CentOS hoặc Docker container — flexible hơn Postgres trên CentOS 7.

---

## Implementation Phases (Estimated)

1. **Phase 1: Setup** — Repo restructure, backend scaffold, MongoDB connection, shared types
2. **Phase 2: Auth** — Register, login, refresh, JWT middleware, HMAC hashing
3. **Phase 3: Sync** — Push/pull with LWW, device tracking, purge
4. **Phase 4: Share** — Create, retrieve (atomic views), meta, delete
5. **Phase 5: Polish** — Validation (zod), error handling, rate limiting, health check
6. **Phase 6: Deploy** — PM2 config, Docker compose update, nginx config update
7. **Phase 7: Client update** — Update `@vaultic/api` package to new endpoints

---

## Success Metrics

- [ ] All current API functionality replicated
- [ ] Security parity verified (HMAC, constant-time compare, JWT)
- [ ] PM2 deploy on CentOS 7 working
- [ ] Sync push/pull with LWW passes all edge case tests
- [ ] Share atomic view counting passes race condition tests
- [ ] Response times ≤ current Rust backend (acceptable trade-off: 2-3x slower OK)

---

## Unresolved Questions

1. **MongoDB hosting on CentOS 7** — MongoDB 7.x dropped CentOS 7 support. Cần dùng MongoDB 4.4 (last CentOS 7 compatible) hoặc chạy MongoDB trong Docker?
2. **Replica set for dev** — Nếu cần transactions, dev environment cần replica set. Dùng `run-rs` hay Docker replica set?
3. **Shared types** — `shared/types/` package sẽ import từ cả backend và client. Cần setup path aliases hoặc pnpm workspace reference.
