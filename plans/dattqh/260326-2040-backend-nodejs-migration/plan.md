---
title: "Migrate Backend from Rust+PostgreSQL to Node.js+Express+Mongoose"
description: "Full backend rewrite to Express+TS+MongoDB with monorepo restructure to flat split layout"
status: completed
priority: P1
effort: 16h
branch: main
tags: [backend, migration, express, mongodb, monorepo]
created: 2026-03-26
completed: 2026-03-26
---

# Backend Node.js Migration Plan

## Goal

Replace Rust/Axum/SeaORM/PostgreSQL backend with Express/TypeScript/Mongoose/MongoDB. Restructure monorepo from `crates/+packages/` to `backend/+client/+shared/` flat split.

## Target Repo Layout

```
vaultic/
├── backend/                  # NEW: Express + Mongoose
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── apps/
│   │   └── extension/        # MOVED from packages/extension
│   └── packages/             # MOVED from packages/*
│       ├── api/
│       ├── crypto/
│       ├── storage/
│       ├── sync/
│       └── ui/
├── shared/
│   └── types/                # MOVED from packages/types
├── _archive/
│   └── crates/               # MOVED from crates/
├── docker/
├── pnpm-workspace.yaml       # UPDATED
├── turbo.json                # UPDATED
└── package.json              # UPDATED
```

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Repo Restructure & Backend Scaffold](./phase-01-repo-restructure-backend-scaffold.md) | 3h | completed |
| 2 | [Auth Module](./phase-02-auth-module.md) | 2h | completed |
| 3 | [Sync Module](./phase-03-sync-module.md) | 3h | completed |
| 4 | [Share Module](./phase-04-share-module.md) | 2h | completed |
| 5 | [Polish & Error Handling](./phase-05-polish-error-handling.md) | 2h | completed |
| 6 | [Deploy & Infrastructure](./phase-06-deploy-infrastructure.md) | 2h | completed |
| 7 | [Client Package Updates](./phase-07-client-package-updates.md) | 2h | completed |

## Key Dependencies

- Phase 1 blocks all others (repo must compile after restructure)
- Phases 2-4 can be done sequentially (shared middleware/models)
- Phase 5 depends on 2-4 (polishes existing code)
- Phase 6 depends on 5 (deploys working backend)
- Phase 7 depends on 2-4 (needs new API endpoints)

## Tech Stack

| Concern | Package |
|---------|---------|
| Framework | express@4 + @types/express |
| DB ODM | mongoose |
| Validation | zod |
| Auth | jsonwebtoken, crypto (builtin HMAC) |
| Logging | pino + pino-http |
| Env | dotenv |
| Dev | tsx (watch), tsc (build) |
| Test | vitest |
| Deploy | PM2 |

## Migration Notes

- All crypto stays client-side (WebCrypto). Server only stores ciphertext
- HMAC-SHA256 server hash uses Node.js `crypto.createHmac` (drop-in for Rust hmac)
- JWT logic identical: access(15m) + refresh(7d), HS256
- LWW sync logic ported 1:1 from Rust
- Atomic view counting uses MongoDB `findOneAndUpdate` with conditions
- UUID fields become string (MongoDB ObjectId not used for user IDs — keep UUID for client compat)

## Validation Summary

**Validated:** 2026-03-26
**Questions asked:** 7

### Confirmed Decisions
- **ID strategy**: Client generates UUID, server stores as string _id. Plan OK as-is.
- **Sync push perf**: Use MongoDB `bulkWrite` instead of per-item loop. Phase 3 needs update.
- **Express version**: Express 4 (not 5). Phase 1 package.json needs `"express": "^4"`.
- **API field naming**: snake_case (keep Rust API compat). No change needed.
- **MongoDB hosting**: Separate server (MongoDB 5+), not on app server. Docker not needed for MongoDB. Phase 6 needs update — MONGODB_URI points to remote host.
- **Testing**: Manual testing only, skip vitest setup for backend. Remove test todos from phases.
- **Git strategy**: Work directly on main. No feature branch.

### Action Items
- [ ] Phase 1: Change `express` dep to `^4`, add `express-async-errors` package for async handler support
- [ ] Phase 3: Rewrite sync push to use `bulkWrite` instead of per-item loop
- [ ] Phase 6: Update Docker Compose — MongoDB NOT in compose (separate server). Only backend service + .env with remote MONGODB_URI
- [ ] Phase 6: PM2 config — single instance fork mode (confirmed)
- [ ] All phases: Remove test-related todos (user tests manually)
