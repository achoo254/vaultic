# Plan Report: Backend Node.js Migration

**Plan:** `D:\CONG VIEC\vaultic\plans\dattqh\260326-2040-backend-nodejs-migration\plan.md`
**Date:** 2026-03-26
**Total Effort:** ~16h across 7 phases

## Summary

Created comprehensive 7-phase migration plan to replace Rust+Axum+SeaORM+PostgreSQL backend with Express+TypeScript+Mongoose+MongoDB. All critical business logic (HMAC auth, LWW sync, atomic share views) has code snippets ported from Rust to Node.js equivalents.

## Phase Overview

| # | Phase | Effort | Key Deliverables |
|---|-------|--------|-----------------|
| 1 | Repo Restructure | 3h | `_archive/crates/`, `backend/`, `client/`, `shared/` layout |
| 2 | Auth Module | 2h | User model, HMAC-SHA256, JWT, 5 endpoints |
| 3 | Sync Module | 3h | Folder+VaultItem models, LWW push, paginated pull |
| 4 | Share Module | 2h | SecureShare model, atomic view counting, TTL index |
| 5 | Polish | 2h | Error middleware, rate limiting, pino logging, CORS |
| 6 | Deploy | 2h | Docker Compose (MongoDB), PM2, Nginx |
| 7 | Client Updates | 2h | @vaultic/api v1 paths, new types, extension verification |

## Critical Logic Ported

- **HMAC-SHA256**: `crypto.createHmac` + `crypto.timingSafeEqual` (constant-time)
- **JWT**: `jsonwebtoken` with access(15m)/refresh(7d), token type enforcement
- **LWW Conflict Resolution**: Per-item timestamp comparison, conflict reporting
- **Atomic View Counting**: MongoDB `findOneAndUpdate` with `$and` conditions
- **Share ID**: 12-char random from `crypto.randomBytes`

## Files Created

```
plans/dattqh/260326-2040-backend-nodejs-migration/
├── plan.md
├── phase-01-repo-restructure-backend-scaffold.md
├── phase-02-auth-module.md
├── phase-03-sync-module.md
├── phase-04-share-module.md
├── phase-05-polish-error-handling.md
├── phase-06-deploy-infrastructure.md
└── phase-07-client-package-updates.md
```
