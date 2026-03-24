---
phase: 1
priority: critical
status: pending
estimated_days: 3
---

# Phase 1: Project Setup & Monorepo

## Overview
Initialize monorepo with Cargo workspace (Rust) + Turborepo (JS/TS). Setup dev environment with Docker PostgreSQL.

## Context Links
- [Brainstorm Architecture](../reports/brainstorm-260324-2007-vaultic-password-manager-architecture.md)
- [Research: Monorepo Structure](../reports/researcher-260324-2025-vaultic-architecture-research.md#3)

## Requirements
- Cargo workspace with 3 crates: `vaultic-crypto`, `vaultic-server`, `vaultic-types`
- Turborepo with 3 packages: `ui`, `extension`, `shared`
- Docker Compose for PostgreSQL 16 (dev)
- CI skeleton (GitHub Actions)
- All Rust crates use `rustls` (not `openssl-sys`)

## Related Code Files

### Create
```
vaultic/
├── Cargo.toml                    # Rust workspace root
├── package.json                  # Turborepo root + pnpm workspace
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .env.example
├── LICENSE                       # AGPL-3.0
├── README.md
├── crates/
│   ├── vaultic-crypto/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── vaultic-server/
│   │   ├── Cargo.toml
│   │   └── src/main.rs
│   └── vaultic-types/
│       ├── Cargo.toml
│       └── src/lib.rs
├── packages/
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── extension/
│   │   ├── package.json
│   │   ├── wxt.config.ts
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── popup/index.tsx
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
└── docker/
    ├── Dockerfile
    ├── docker-compose.dev.yml
    └── docker-compose.prod.yml
```

## Implementation Steps

### 1. Initialize Git + Cargo workspace (30min)
```bash
cd "D:/CONG VIEC/vaultic"
git init
```

Create root `Cargo.toml`:
```toml
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
thiserror = "2"
```

Create each crate's `Cargo.toml`:
- `vaultic-crypto`: `aes-gcm`, `argon2`, `hkdf`, `sha2`, `rand`, `base64`
- `vaultic-server`: `axum`, `sea-orm`, `tokio`, `tower-http`, `jsonwebtoken`, `reqwest` (rustls)
- `vaultic-types`: `serde`, `uuid`, `chrono`

### 2. Initialize Turborepo + pnpm workspace (30min)
```bash
pnpm init
pnpm add -D turbo
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "persistent": true, "cache": false },
    "build": { "dependsOn": ["^build"], "outputs": [".output/**", "dist/**"] },
    "lint": {},
    "test": {}
  }
}
```

### 3. Setup WXT extension package (1h)
```bash
cd packages/extension
pnpm create wxt@latest . --template react
```

Install shared deps:
```bash
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add zustand @radix-ui/react-dialog
```

`wxt.config.ts`:
```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vaultic Password Manager',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms'],
    host_permissions: ['<all_urls>'],
  },
});
```

### 4. Setup shared UI package (30min)
Initialize `packages/ui` with React + shadcn/ui components.
Configure Tailwind CSS shared config.
Export reusable components: Button, Input, Dialog, Card.

### 5. Setup shared TS package (30min)
Initialize `packages/shared` with TypeScript.
Define shared types: `VaultItem`, `User`, `Folder`, `SecureShare`.
Create API client skeleton with `ofetch`.

### 6. Docker setup (1h)
`docker/docker-compose.dev.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: vaultic
      POSTGRES_USER: vaultic
      POSTGRES_PASSWORD: dev
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

`docker/Dockerfile` (multi-stage for server):
```dockerfile
FROM rust:1.77-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/
RUN cargo build --release --bin vaultic-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/vaultic-server /usr/local/bin/
EXPOSE 8080
CMD ["vaultic-server"]
```

### 7. Git setup + CI skeleton (30min)
`.gitignore`: target/, node_modules/, .env, dist/, .output/

GitHub Actions skeleton: `.github/workflows/ci.yml`
- Rust: `cargo test`, `cargo clippy`
- Extension: `pnpm lint`, `pnpm build`
- Docker build on merge to main

## Todo List
- [ ] Git init + Cargo workspace
- [ ] Create 3 Rust crates with Cargo.toml
- [ ] Turborepo + pnpm workspace
- [ ] WXT extension package (React + TS)
- [ ] Shared UI package (shadcn/ui)
- [ ] Shared TS types package
- [ ] Docker Compose dev
- [ ] Dockerfile multi-stage
- [ ] .gitignore + .env.example
- [ ] GitHub Actions CI skeleton
- [ ] Verify: `cargo build` succeeds
- [ ] Verify: `pnpm dev` starts extension dev server
- [ ] Verify: `docker compose up` starts PostgreSQL

## Success Criteria
- `cargo build --workspace` compiles all Rust crates
- `pnpm dev --filter extension` starts WXT dev server
- `docker compose -f docker/docker-compose.dev.yml up` starts PostgreSQL
- All crates can import workspace dependencies
- Extension popup shows "Vaultic" placeholder page
