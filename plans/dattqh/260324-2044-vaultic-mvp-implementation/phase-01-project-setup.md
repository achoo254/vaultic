---
phase: 1
priority: critical
status: pending
estimated_days: 4
---

# Phase 1: Project Setup & Monorepo (Production-Ready)

## Overview
Initialize production-ready monorepo with Cargo workspace (Rust) + Turborepo (pnpm). Modular TS packages: types, crypto, storage, sync, api, ui, extension. Docker PostgreSQL for dev. GitLab CI skeleton.

## Context Links
- [Brainstorm Architecture](../reports/brainstorm-260324-2007-vaultic-password-manager-architecture.md)
- [Research: Monorepo Structure](../reports/researcher-260324-2025-vaultic-architecture-research.md#3)

## Requirements
- Cargo workspace with 4 crates: `vaultic-crypto`, `vaultic-server`, `vaultic-types`, `vaultic-migration`
- Turborepo with 7 packages: `types`, `crypto`, `storage`, `sync`, `api`, `ui`, `extension`
- Docker Compose for PostgreSQL 16 (dev)
- GitLab CI skeleton (gitlabs.inet.vn)
- All Rust crates use `rustls` (not `openssl-sys`)

## Related Code Files

### Create
```
vaultic/
├── Cargo.toml                    # Rust workspace root
├── package.json                  # Turborepo root + pnpm workspace
├── pnpm-workspace.yaml
├── turbo.json
├── .gitlab-ci.yml
├── .gitignore
├── .env.example
├── LICENSE                       # AGPL-3.0
├── README.md
│
├── crates/
│   ├── vaultic-crypto/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   ├── vaultic-server/
│   │   ├── Cargo.toml
│   │   └── src/main.rs
│   ├── vaultic-types/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── vaultic-migration/
│       ├── Cargo.toml
│       └── src/lib.rs
│
├── packages/
│   ├── types/                    # Shared TS types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── user.ts
│   │       ├── vault.ts
│   │       ├── sync.ts
│   │       ├── share.ts
│   │       └── crypto.ts
│   ├── crypto/                   # WebCrypto bridge
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── kdf.ts
│   │       ├── cipher.ts
│   │       ├── password-gen.ts
│   │       └── utils.ts
│   ├── storage/                  # Storage abstraction + IndexedDB impl
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── vault-store.ts
│   │       ├── sync-queue.ts
│   │       ├── indexeddb-store.ts
│   │       └── memory-store.ts
│   ├── sync/                     # Sync engine
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── sync-engine.ts
│   │       ├── conflict-resolver.ts
│   │       └── device.ts
│   ├── api/                      # Server API client
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       ├── auth-api.ts
│   │       ├── sync-api.ts
│   │       └── share-api.ts
│   ├── ui/                       # Shared React components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── components/
│   │       └── styles/
│   └── extension/                # WXT browser extension
│       ├── package.json
│       ├── wxt.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── entrypoints/
│           │   ├── popup/
│           │   │   ├── App.tsx
│           │   │   ├── main.tsx
│           │   │   └── index.html
│           │   └── background.ts
│           ├── components/
│           ├── stores/
│           ├── hooks/
│           └── assets/
│               └── styles.css
│
└── docker/
    ├── Dockerfile
    ├── docker-compose.dev.yml
    └── docker-compose.prod.yml
```

## Implementation Steps

### 1. Initialize Cargo workspace (30min)
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
- `vaultic-migration`: `sea-orm-migration`

### 2. Initialize Turborepo + pnpm workspace (30min)
```bash
pnpm init
pnpm add -D turbo typescript
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

### 3. Setup packages/types (30min)
Shared TS types — mirrors `vaultic-types` Rust crate.
```typescript
// packages/types/src/vault.ts
export enum ItemType { Login = 1, SecureNote = 2, Card = 3, Identity = 4 }

export interface VaultItem {
  id: string;
  folder_id?: string;
  item_type: ItemType;
  encrypted_data: string;  // base64(nonce + ciphertext)
  device_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Folder { id: string; encrypted_name: string; parent_id?: string; }
```

### 4. Setup packages/crypto (30min)
WebCrypto bridge — skeleton with exports.
```typescript
// packages/crypto/src/index.ts
export { deriveMasterKey, deriveEncryptionKey, deriveAuthHash } from './kdf';
export { encrypt, decrypt } from './cipher';
export { generatePassword } from './password-gen';
```
Deps: `argon2-browser` (for Argon2id in browser). Implementation in Phase 2/4.

### 5. Setup packages/storage (1h)
VaultStore interface + IndexedDB implementation.
```typescript
// packages/storage/src/vault-store.ts
export interface VaultStore {
  getItem(id: string): Promise<EncryptedItem | null>;
  putItem(item: EncryptedItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  getAllItems(): Promise<EncryptedItem[]>;
  getChangedSince(timestamp: number): Promise<EncryptedItem[]>;
}

// packages/storage/src/sync-queue.ts
export interface SyncQueue {
  enqueue(entry: SyncQueueEntry): Promise<void>;
  dequeueAll(): Promise<SyncQueueEntry[]>;
  clear(ids: string[]): Promise<void>;
}
```

IndexedDB implementation with `idb`:
```bash
cd packages/storage && pnpm add idb
```

Memory implementation for testing.

### 6. Setup packages/sync (30min)
Sync engine skeleton.
```typescript
// packages/sync/src/sync-engine.ts
export class SyncEngine {
  constructor(
    private store: VaultStore,
    private queue: SyncQueue,
    private api: SyncApi,
    private resolver: ConflictResolver,
  ) {}
  async sync(): Promise<SyncResult> { /* Phase 5 */ }
}

// packages/sync/src/conflict-resolver.ts
export interface ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem;
}
export class LWWResolver implements ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem {
    return remote.updated_at > local.updated_at ? remote : local;
  }
}
```

### 7. Setup packages/api (30min)
Server API client skeleton.
```typescript
// packages/api/src/client.ts
import { ofetch } from 'ofetch';
export function createApiClient(baseUrl: string, getToken: () => string | null) {
  return ofetch.create({
    baseURL: baseUrl,
    onRequest({ options }) {
      const token = getToken();
      if (token) options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
    },
  });
}
```
Deps: `ofetch`

### 8. Setup packages/ui + Design Tokens (1h)
Shared React components with shadcn/ui.
```bash
cd packages/ui && pnpm add react react-dom
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu lucide-react
```
Export: Button, Input, Dialog, Card, DropdownMenu.

**Extract design tokens from `system-design.pen`** via Pencil MCP tools:
```typescript
// packages/ui/src/styles/design-tokens.ts
// Source of truth — extracted from system-design.pen
export const tokens = {
  colors: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    text: '#18181B',
    secondary: '#71717A',
    border: '#E4E4E7',
    background: '#FFFFFF',
    surface: '#F4F4F5',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  font: {
    family: "'Inter', sans-serif",
    size: { xs: 11, sm: 13, base: 14, lg: 16, xl: 18, xxl: 24 },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, full: 9999 },
  extension: { width: 380, height: 520 },
  icon: { size: { sm: 16, md: 20, lg: 24 }, strokeWidth: 1.5 },
} as const;
```
**ALL UI components MUST use these tokens. Never hardcode values.**

### 9. Setup packages/extension (1h)
```bash
cd packages/extension
pnpm create wxt@latest . --template react
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

Add internal package deps:
```bash
pnpm add @vaultic/types @vaultic/crypto @vaultic/storage @vaultic/sync @vaultic/api @vaultic/ui
pnpm add zustand
```

### 10. Docker setup (1h)
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

### 11. Git setup + CI skeleton (30min)
`.gitignore`: target/, node_modules/, .env, dist/, .output/

`.gitlab-ci.yml` (gitlabs.inet.vn self-hosted):
- Rust: `cargo test`, `cargo clippy`
- Extension: `pnpm lint`, `pnpm build`
- Docker build on tag push

## Todo List
- [ ] Cargo workspace + 4 crates (crypto, server, types, migration)
- [ ] Turborepo + pnpm workspace
- [ ] packages/types — TS types (vault, user, sync, share, crypto)
- [ ] packages/crypto — WebCrypto bridge skeleton
- [ ] packages/storage — VaultStore + SyncQueue interfaces + IndexedDB impl
- [ ] packages/sync — SyncEngine + ConflictResolver (LWW) skeleton
- [ ] packages/api — API client skeleton (ofetch)
- [ ] packages/ui — shadcn/ui shared components
- [ ] packages/extension — WXT + React setup
- [ ] Docker Compose dev (PostgreSQL)
- [ ] Dockerfile multi-stage
- [ ] .gitignore + .env.example + LICENSE
- [ ] .gitlab-ci.yml skeleton
- [ ] Verify: `cargo build --workspace` succeeds
- [ ] Verify: `pnpm build` all packages succeed
- [ ] Verify: `pnpm dev --filter extension` starts WXT dev server
- [ ] Verify: `docker compose up` starts PostgreSQL

## Success Criteria
- `cargo build --workspace` compiles all 4 Rust crates
- `pnpm build` builds all 7 TS packages without error
- `pnpm dev --filter extension` starts WXT dev server
- Extension can import from all @vaultic/* packages
- `docker compose -f docker/docker-compose.dev.yml up` starts PostgreSQL
- Extension popup shows "Vaultic" placeholder page
- All interfaces (VaultStore, SyncQueue, ConflictResolver, ApiClient) defined and exported
