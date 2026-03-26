# Phase 1: Repo Restructure & Backend Scaffold

## Context
- [plan.md](./plan.md) — overview
- Current: `crates/` (Rust) + `packages/*` (TS)
- Target: `backend/` + `client/` + `shared/` + `_archive/crates/`

## Overview
- **Priority:** P1 (blocks all phases)
- **Status:** completed
- **Description:** Restructure monorepo layout, scaffold Express+TS+Mongoose backend, verify all packages compile

## Key Insights
- pnpm-workspace.yaml currently: `packages: ["packages/*"]`
- turbo.json has build/dev/lint/test tasks — must include backend
- All TS packages use `@vaultic/*` scope with `workspace:*` references
- Extension is in `packages/extension/`, needs to move to `client/apps/extension/`
- `packages/types/` becomes `shared/types/` (used by both backend + client)

## Files to Create

```
backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts              # Express app bootstrap
│   ├── config/
│   │   └── env-config.ts      # Env vars loader (mirrors Rust AppConfig)
│   ├── middleware/
│   │   └── auth-middleware.ts  # JWT Bearer extraction (placeholder)
│   ├── models/                 # (empty — Phase 2-4)
│   ├── routes/
│   │   └── health-route.ts    # GET /api/v1/health
│   ├── services/               # (empty — Phase 2-4)
│   └── utils/
│       └── app-error.ts       # AppError class hierarchy
```

## Files to Move

| From | To |
|------|----|
| `crates/` | `_archive/crates/` |
| `packages/extension/` | `client/apps/extension/` |
| `packages/api/` | `client/packages/api/` |
| `packages/crypto/` | `client/packages/crypto/` |
| `packages/storage/` | `client/packages/storage/` |
| `packages/sync/` | `client/packages/sync/` |
| `packages/ui/` | `client/packages/ui/` |
| `packages/types/` | `shared/types/` |

## Files to Modify

| File | Change |
|------|--------|
| `pnpm-workspace.yaml` | Update packages array |
| `turbo.json` | No change needed (task-based, not path-based) |
| `package.json` (root) | Keep as-is (turbo scripts) |
| `Cargo.toml` | Remove or comment out workspace members |
| All `package.json` in moved packages | Update `@vaultic/types` dep path if needed |

## Implementation Steps

### 1. Archive Rust crates
```bash
mkdir -p _archive
git mv crates/ _archive/crates/
# Comment out Cargo.toml workspace members (keep file for reference)
```

### 2. Restructure client packages
```bash
mkdir -p client/apps client/packages
git mv packages/extension client/apps/extension
git mv packages/api client/packages/api
git mv packages/crypto client/packages/crypto
git mv packages/storage client/packages/storage
git mv packages/sync client/packages/sync
git mv packages/ui client/packages/ui
```

### 3. Move shared types
```bash
mkdir -p shared
git mv packages/types shared/types
```

### 4. Remove empty packages/ dir
```bash
rmdir packages  # should be empty now
```

### 5. Update pnpm-workspace.yaml
```yaml
packages:
  - "backend"
  - "client/apps/*"
  - "client/packages/*"
  - "shared/*"
```

### 6. Scaffold backend/package.json
```json
{
  "name": "@vaultic/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@vaultic/types": "workspace:*",
    "express": "^5",
    "mongoose": "^8",
    "zod": "^3",
    "jsonwebtoken": "^9",
    "dotenv": "^16",
    "pino": "^9",
    "pino-http": "^10",
    "cors": "^2"
  },
  "devDependencies": {
    "@types/express": "^5",
    "@types/jsonwebtoken": "^9",
    "@types/cors": "^2",
    "tsx": "^4",
    "typescript": "^5.7",
    "vitest": "^4"
  }
}
```

### 7. Scaffold backend/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 8. Create backend/src/server.ts (minimal bootstrap)
- Load dotenv
- Create Express app
- Mount health route at `/api/v1/health`
- Connect Mongoose
- Start listening

### 9. Create backend/src/utils/app-error.ts
Port from Rust `AppError` enum:
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
  static badRequest(msg: string) { return new AppError(400, msg); }
  static unauthorized(msg: string) { return new AppError(401, msg); }
  static notFound(msg: string) { return new AppError(404, msg); }
  static conflict(msg: string) { return new AppError(409, msg); }
  static gone(msg: string) { return new AppError(410, msg); }
  static internal(msg: string) { return new AppError(500, msg); }
}
```

### 10. Create backend/src/config/env-config.ts
Port from Rust `AppConfig`:
- `MONGODB_URI` (was `DATABASE_URL`)
- `JWT_SECRET`
- `SERVER_PORT` (default 8080)
- `ACCESS_TOKEN_TTL_MIN` (default 15)
- `REFRESH_TOKEN_TTL_DAYS` (default 7)

### 11. Verify compilation
```bash
pnpm install
pnpm build  # All packages must compile
```

### 12. Fix any broken import paths
- Check all `@vaultic/types` imports resolve from new locations
- pnpm workspace protocol handles this if workspace.yaml correct

## Todo

- [x] Archive Rust crates to `_archive/crates/`
- [x] Comment out Cargo.toml workspace members
- [x] Move extension to `client/apps/extension/`
- [x] Move 5 packages to `client/packages/`
- [x] Move types to `shared/types/`
- [x] Update `pnpm-workspace.yaml`
- [x] Create `backend/package.json`
- [x] Create `backend/tsconfig.json`
- [x] Create `backend/src/server.ts`
- [x] Create `backend/src/utils/app-error.ts`
- [x] Create `backend/src/config/env-config.ts`
- [x] Create `backend/src/routes/health-route.ts`
- [x] Run `pnpm install && pnpm build` — all green
- [x] Verify extension dev still works

## Success Criteria
- `pnpm build` passes for all packages
- `pnpm --filter @vaultic/backend dev` starts Express on port 8080
- `GET /api/v1/health` returns 200
- No broken imports across any package

## Risk Assessment
- **Import paths break**: pnpm workspace resolves by package name, not path — low risk if workspace.yaml correct
- **Extension build breaks**: WXT may have path assumptions — test after move
- **Turbo cache stale**: Run `turbo clean` after restructure
