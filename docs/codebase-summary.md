# Vaultic: Codebase Summary

**Generated from Phase 1 completion. Last updated: 2026-03-25**

---

## Codebase Statistics

| Metric | Count |
|--------|-------|
| Total files | 123 |
| Total tokens | ~143K |
| Total characters | ~588K |
| Rust crates | 4 |
| TypeScript packages | 7 |
| Docker configs | 2 |
| CI/CD configs | 1 |

---

## Rust Crates (Server-side)

### 1. `crates/vaultic-crypto/` — Cryptographic Primitives

**Purpose:** Core encryption algorithms (Argon2id, AES-256-GCM, HKDF, password generation).

**Key Files:**
- `src/lib.rs` — Public API exports (8 lines)
- `src/types.rs` — MasterKey, EncryptionKey, AuthHash newtypes with Zeroize
- `src/error.rs` — CryptoError enum (Kdf, Encryption, Decryption, InvalidInput)
- `src/kdf.rs` — Argon2id (m=64MB, t=3, p=4) + HKDF-SHA256 key derivation
- `src/cipher.rs` — AES-256-GCM encrypt/decrypt with random 96-bit nonce
- `src/password_gen.rs` — CSPRNG password generator with configurable character sets

**Exports:**
```rust
pub use cipher::{decrypt, encrypt};
pub use error::CryptoError;
pub use kdf::{derive_auth_hash, derive_encryption_key, derive_master_key};
pub use password_gen::{generate_password, generate_share_key, PasswordGenOptions, ShareKey};
pub use types::{AuthHash, EncryptionKey, MasterKey};
```

**Phase 2 Status:** Fully implemented. All crypto primitives complete.

**Argon2id Parameters (OWASP):**
- Memory: 64 MiB (ARGON2_M_COST = 65536 KiB)
- Time cost: 3 iterations (ARGON2_T_COST)
- Parallelism: 4 (ARGON2_P_COST)
- Hash output: 32 bytes (256-bit)

**Key Derivation:**
- Master key: Argon2id(password, email as salt)
- Encryption key: HKDF-SHA256(master_key, info="vaultic-enc")
- Auth hash: HKDF-SHA256(master_key, info="vaultic-auth") + SHA-256 (server never sees value that derives enc key)

**Dependencies:**
- `aes-gcm = "0.10"` — AES-256-GCM authenticated encryption
- `argon2 = "0.5"` — Argon2id KDF
- `hkdf = "0.12"` — HMAC-based key derivation
- `sha2 = "0.10"` — SHA-256 hash
- `rand = "0.8"` — Cryptographically secure random number generation
- `zeroize = "1.7"` — Automatic memory zeroization on drop
- Workspace deps: `serde`, `thiserror`

---

### 2. `crates/vaultic-types/` — Shared Type Definitions

**Purpose:** Domain types used in API contracts (Rust side), serializable via serde.

**Key Files:**
- `src/lib.rs` — Type exports
- `src/user.rs` — `User`, `LoginRequest`, `LoginResponse`
- `src/vault.rs` — `VaultItem`, `VaultItemType` (password|note|card|identity)
- `src/sync.rs` — `Delta`, `SyncRequest`, `SyncResponse`
- `src/share.rs` — `ShareLink`, `ShareRequest`, `ShareResponse`

**Key Types:**
```rust
pub struct User {
    pub id: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

pub struct VaultItem {
    pub id: String,
    pub user_id: String,
    pub item_type: VaultItemType,
    pub title: String,
    pub ciphertext: String, // base64 AES-256-GCM
    pub timestamp: DateTime<Utc>,
}

pub struct Delta {
    pub id: String,
    pub item_id: String,
    pub encrypted: String,
    pub timestamp: DateTime<Utc>,
}
```

**Phase 1 Status:** Type framework defined. Detailed impls in Phase 3.

---

### 3. `crates/vaultic-server/` — Axum API Server

**Purpose:** HTTP API server (authentication, sync relay, share broker).

**Key Files:**
- `src/main.rs` — Axum server initialization + router setup
- `src/routes/` — Handler functions (created in Phase 3)
- `src/db/` — Database query layer (created in Phase 3)
- `src/middleware/` — Auth, CORS, logging (created in Phase 3)
- `src/error.rs` — Error types

**Planned Endpoints (Phase 3+):**
```
POST   /auth/register            — New user registration
POST   /auth/login               — User login
POST   /auth/refresh             — Refresh JWT token
POST   /auth/logout              — Logout (invalidate token)
GET    /auth/me (protected)      — Current user profile

POST   /sync/pull (protected)    — Fetch deltas since timestamp
POST   /sync/push (protected)    — Push encrypted deltas
GET    /sync/status (protected)  — Sync state check

POST   /share/create (protected) — Generate share link
GET    /share/:link_id           — Download encrypted item
DELETE /share/:link_id (protected) — Revoke share
```

**Workspace Dependencies:**
- `tokio = "1"` — Async runtime
- `serde`, `serde_json` — Serialization
- `uuid`, `chrono` — IDs and timestamps
- `thiserror` — Error handling

**Phase 1 Status:** Router skeleton in place. Handlers + DB in Phase 3.

---

### 4. `crates/vaultic-migration/` — Database Migrations

**Purpose:** SeaORM-based database migrations (PostgreSQL 16).

**Key Files:**
- `src/lib.rs` — Migration runner + m_*.rs files

**Planned Migrations (Phase 3):**
- `m001_create_users_table` — users (id, email, password_hash, created_at)
- `m002_create_vault_items_table` — vault_items (id, user_id, ciphertext, timestamp)
- `m003_create_sync_deltas_table` — sync_deltas (id, user_id, device_id, item_id, encrypted, timestamp)
- `m004_create_share_links_table` — share_links (id, user_id, encrypted_item, expires_at)
- `m005_create_sessions_table` — sessions (id, user_id, jwt_token, expires_at)

**Phase 1 Status:** Scaffolded. Migrations in Phase 3.

---

## TypeScript Packages

### 1. `packages/types/` — Shared Type Definitions

**Purpose:** TypeScript interfaces mirroring `vaultic-types` Rust crate.

**Key Files:**
- `src/index.ts` — Type exports
- `src/user.ts` — `User`, `LoginRequest`, `LoginResponse`
- `src/vault.ts` — `VaultItem`, `VaultItemType`
- `src/sync.ts` — `Delta`, `SyncState`, `SyncEngine`
- `src/share.ts` — `ShareLink`, `ShareRequest`
- `src/crypto.ts` — Crypto result types

**Key Types:**
```typescript
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

interface VaultItem {
  id: string;
  type: 'password' | 'note' | 'card' | 'identity';
  title: string;
  ciphertext: string; // base64 AES-256-GCM
  timestamp: Date;
}

interface Delta {
  id: string;
  itemId: string;
  encrypted: string;
  timestamp: Date;
  deviceId?: string;
}
```

**Phase 1 Status:** Framework defined. Synced with Rust types.

---

### 2. `packages/crypto/` — WebCrypto + Argon2 Bridge

**Purpose:** Client-side encryption using WebCrypto API + argon2-browser.

**Key Files:**
- `src/index.ts` — Public API
- `src/kdf.ts` — Argon2id + HKDF key derivation
- `src/cipher.ts` — AES-256-GCM encryption/decryption
- `src/password-gen.ts` — Secure password generation

**Key Functions:**
```typescript
async function deriveKey(password: string, salt?: Uint8Array): Promise<CryptoKey> {
  // Argon2id(password, salt) → master key via argon2-browser
}

async function deriveKeys(masterKey: CryptoKey): Promise<DerivedKeys> {
  // HKDF expand master key → {encKey, authKey, ...}
}

async function encryptItem(item: VaultItem, encKey: CryptoKey): Promise<string> {
  // AES-256-GCM(JSON.stringify(item), encKey) → base64
}

async function decryptItem(ciphertext: string, encKey: CryptoKey): Promise<VaultItem> {
  // AES-256-GCM decrypt → JSON.parse
}

function generatePassword(length: number = 16): string {
  // Secure random alphanumeric + symbols
}
```

**Dependencies:**
- `argon2-browser` — Argon2id in browser WASM
- `@vaultic/types` — Type definitions

**Phase 1 Status:** Interface defined. Implementation in Phase 2.

---

### 3. `packages/storage/` — Local Storage Abstraction

**Purpose:** Abstract vault storage (IndexedDB for extension, SQLite for desktop).

**Key Files:**
- `src/index.ts` — Public API
- `src/vault-store.ts` — `VaultStore` interface
- `src/indexeddb-store.ts` — IndexedDB implementation
- `src/memory-store.ts` — In-memory implementation (testing)
- `src/sync-queue.ts` — `SyncQueue` for delta tracking

**Key Interfaces:**
```typescript
interface VaultStore {
  getItem(id: string): Promise<VaultItem>;
  setItem(item: VaultItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  getAll(): Promise<VaultItem[]>;
  search(query: string): Promise<VaultItem[]>;
  clearAll(): Promise<void>;
}

interface SyncQueue {
  enqueue(delta: Delta): Promise<void>;
  getAll(): Promise<Delta[]>;
  ack(deltaId: string): Promise<void>;
  clearAcked(): Promise<void>;
}
```

**Implementations:**
- `IndexedDBStore` — Extension (browser IndexedDB)
- `MemoryStore` — Testing (RAM only)
- Future: SQLiteStore (desktop)

**Phase 1 Status:** Interfaces defined. IndexedDB impl in Phase 5.

---

### 4. `packages/sync/` — Sync Engine

**Purpose:** Delta sync + conflict resolution (last-write-wins).

**Key Files:**
- `src/index.ts` — Public API
- `src/sync-engine.ts` — Main sync logic
- `src/conflict-resolver.ts` — LWW conflict resolution
- `src/device.ts` — Device identity + tracking

**Key Classes:**
```typescript
class SyncEngine {
  async pushDeltas(deltas: Delta[]): Promise<void>;
  async pullDeltas(since: Date): Promise<Delta[]>;
  async applyDeltas(deltas: Delta[]): Promise<void>;
  resolve(local: Delta, remote: Delta): Delta;
}

class ConflictResolver {
  // Last-write-wins: compare timestamps
  resolve(local: Delta, remote: Delta): Delta {
    return local.timestamp > remote.timestamp ? local : remote;
  }
}

class Device {
  id: string;
  name: string;
  lastSyncTime: Date;
}
```

**Phase 1 Status:** Interface defined. Logic in Phase 5.

---

### 5. `packages/api/` — API Client

**Purpose:** HTTP client wrapper (ofetch) for server communication.

**Key Files:**
- `src/index.ts` — Public API
- `src/client.ts` — Base HTTP client setup
- `src/auth-api.ts` — `/auth/*` endpoints
- `src/sync-api.ts` — `/sync/*` endpoints
- `src/share-api.ts` — `/share/*` endpoints

**Key Functions:**
```typescript
// Base client
const client = createApiClient(baseUrl, token);

// Auth
async function register(email: string, password: string): Promise<AuthResponse>;
async function login(email: string, password: string): Promise<AuthResponse>;
async function refresh(refreshToken: string): Promise<AuthResponse>;

// Sync
async function pushDeltas(deltas: Delta[]): Promise<void>;
async function pullDeltas(since: Date): Promise<Delta[]>;

// Share
async function createShareLink(item: VaultItem, password: string): Promise<ShareLink>;
async function getShareLink(linkId: string, password: string): Promise<VaultItem>;
```

**Dependencies:**
- `ofetch` — Lightweight HTTP client
- `@vaultic/types` — Type definitions

**Phase 1 Status:** Interface defined. Handlers in Phase 3.

---

### 6. `packages/ui/` — React Components + Design Tokens

**Purpose:** Shared UI components and single source of truth for design.

**Key Files:**
- `src/index.ts` — Component exports
- `src/components/button.tsx` — Button component
- `src/components/input.tsx` — Input component
- `src/styles/design-tokens.ts` — DESIGN TOKENS (MANDATORY)

**Design Tokens (SINGLE SOURCE OF TRUTH):**
```typescript
export const colors = {
  primary: '#2563EB',           // Blue
  text: '#18181B',              // Near-black
  secondary: '#71717A',         // Gray
  borders: '#E4E4E7',           // Light gray
  background: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

export const typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  },
  weights: {
    regular: 400,
    semibold: 600,
    bold: 700,
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

export const layout = {
  extension: {
    width: 380,
    height: 520,
  },
};

export const icons = {
  size: '16px',
  strokeWidth: 1.5,
};
```

**Rule:** ALL UI must use these tokens. NO hardcoding colors, sizes, or fonts.

**Components (Scaffolded):**
- `Button` — Primary, secondary variants
- `Input` — Text input with validation
- Future: Modal, Select, Checkbox, etc.

**Phase 1 Status:** Tokens centralized. Components expand in Phase 4–6.

---

### 7. `packages/extension/` — WXT Browser Extension

**Purpose:** Primary UI (Chrome MV3 + Firefox).

**Key Files:**
- `src/entrypoints/popup/` — Popup UI (380×520px)
  - `index.html` — DOM structure
  - `main.tsx` — React entry point
  - `app.tsx` — Root component
- `src/entrypoints/background.ts` — Service worker
- `src/assets/styles.css` — Global styles
- `wxt.config.ts` — WXT framework config
- `tsconfig.json` — TypeScript config

**Architecture:**
```
┌─────────────────────────────┐
│      Popup UI (React)       │
│  - Vault list + search      │
│  - Item details modal       │
│  - Settings               │
└────────────┬────────────────┘
             │ Messages
             ↓
┌─────────────────────────────┐
│   Service Worker (MW)        │
│  - Vault cache               │
│  - Encryption/decryption     │
│  - Sync coordinator          │
│  - Message routing           │
└─────────────────────────────┘
             │ Runtime messages
             ↓
┌─────────────────────────────┐
│   Content Script (Phase 6)   │
│  - Form detection            │
│  - Auto-fill injection       │
└─────────────────────────────┘
```

**Dependencies:**
- `wxt = "^0.10"` — Extension framework (abstraction over MV3)
- React 18 + TypeScript
- `@vaultic/crypto`, `@vaultic/storage`, `@vaultic/sync`, `@vaultic/api`

**Phase 1 Status:** Scaffold only. UI in Phases 4–6.

---

## Configuration Files

### `Cargo.toml` (Workspace Root)
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

**Purpose:** Cargo workspace definition + shared dependencies.

---

### `package.json` (Workspace Root)
```json
{
  "name": "vaultic",
  "private": true,
  "version": "0.1.0",
  "description": "Open-source, extension-first password manager with zero-knowledge encryption",
  "license": "AGPL-3.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.7"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Purpose:** pnpm workspace definition + Turbo config.

---

### `turbo.json`
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "cache": false
    },
    "lint": {},
    "test": {}
  }
}
```

**Purpose:** Turbo task orchestration (dependency graph, caching).

---

### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

**Purpose:** Base TypeScript config (inherited by all packages).

---

### `.gitlab-ci.yml`
```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - cargo build --release
    - pnpm build
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .

test:
  stage: test
  script:
    - cargo test --workspace
    - pnpm test
    - cargo clippy --all-targets
    - cargo fmt --check

deploy:
  stage: deploy
  script:
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
```

**Purpose:** GitLab CI/CD pipeline (build, test, deploy).

---

### `docker/Dockerfile`
```dockerfile
# Multi-stage build
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release -p vaultic-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libpq5
COPY --from=builder /app/target/release/vaultic-server /usr/local/bin/
EXPOSE 8080
CMD ["vaultic-server"]
```

**Purpose:** Multi-stage Docker build for vaultic-server.

---

### `docker/docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vaultic
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  vaultic-server:
    build: ..
    ports:
      - '8080:8080'
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/vaultic
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Purpose:** Local dev environment (PostgreSQL 16 + vaultic-server).

---

## Environment Variables (`.env.example`)

```env
# Server
RUST_LOG=info
SERVER_PORT=8080
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY_HOURS=24

# Database
DATABASE_URL=postgres://user:password@localhost:5432/vaultic

# API
API_BASE_URL=http://localhost:8080
CORS_ORIGIN=chrome-extension://extension-id-here

# Crypto (optional server-side)
ARGON2_MEMORY=65540
ARGON2_TIME=2
ARGON2_PARALLELISM=4
```

---

## Key Design Decisions (Phase 1)

| Decision | Rationale | Status |
|----------|-----------|--------|
| **Offline-first** | Users own their data; sync is OPT-IN | ✅ Implemented |
| **WebCrypto over WASM** | Simpler crypto for MVP; browser native API | ✅ Used |
| **Delta sync + LWW** | Minimal bandwidth; simple conflict resolution | ✅ Designed |
| **Extension-first** | Primary UI is 380×520px popup | ✅ Scaffold |
| **Single master key** | User enters password once per session | ✅ Designed |
| **Server: sync relay only** | Accepts encrypted blobs; never decrypts | ✅ Designed |
| **IndexedDB for storage** | Browser native; works offline | ✅ Designed |
| **Rust + Axum** | Performance + safety; async-first | ✅ Chosen |
| **PostgreSQL 16** | Reliable, proven, ACID compliance | ✅ Chosen |
| **Docker for deployment** | CentOS 7 production; portable | ✅ Configured |

---

## Phase 1 Completion Checklist

- [x] Cargo workspace created + 4 crates compile
- [x] pnpm workspace created + 7 packages compile
- [x] Type definitions mirrored (Rust ↔ TS)
- [x] Design tokens centralized (no hardcoding)
- [x] Docker Compose for PostgreSQL 16
- [x] Multi-stage Dockerfile for vaultic-server
- [x] GitLab CI skeleton
- [x] .env.example + LICENSE (AGPL-3.0)
- [x] .gitignore configured
- [x] All builds pass without warnings

---

## Next Steps (Phase 3)

### API Server & Database
1. Implement `crates/vaultic-server/src/routes/`
   - Auth endpoints: /auth/register, /auth/login, /auth/refresh, /auth/logout
   - Sync endpoints: /sync/pull, /sync/push, /sync/status
   - Share endpoints: /share/create, /share/:link_id, /share/:link_id DELETE
2. Implement database models via SeaORM
   - Migrate users table with password_hash
   - Migrate sync_deltas table
   - Migrate share_links and sessions tables
3. Implement middleware
   - JWT auth validation
   - CORS restriction (extension origin)
   - Rate limiting on /auth/* endpoints
4. Write comprehensive integration tests
5. Verify database migrations run clean

---

## File Organization by Layer

```
Client (TypeScript)
├── packages/types/           ← Type definitions
├── packages/crypto/          ← WebCrypto + Argon2
├── packages/storage/         ← IndexedDB abstraction
├── packages/sync/            ← Sync engine + conflict resolution
├── packages/api/             ← HTTP client (ofetch)
├── packages/ui/              ← React components + design tokens
└── packages/extension/       ← WXT browser extension

Server (Rust)
├── crates/vaultic-types/     ← Type definitions
├── crates/vaultic-crypto/    ← Crypto primitives
├── crates/vaultic-server/    ← Axum API server
└── crates/vaultic-migration/ ← SeaORM migrations

Infrastructure
├── docker/                   ← Dockerfile + compose
└── .gitlab-ci.yml            ← CI/CD pipeline
```

---

## Build & Development Commands

```bash
# Rust
cargo build --workspace
cargo test --workspace
cargo clippy --all-targets

# TypeScript
pnpm install
pnpm build
pnpm test
pnpm lint

# Docker
docker compose -f docker/docker-compose.yml up postgres
docker compose -f docker/docker-compose.yml up

# CI/CD
# Push to main branch triggers .gitlab-ci.yml
```

---

## Quality Metrics (Phase 1)

| Metric | Target | Achieved |
|--------|--------|----------|
| **Compilation** | 0 errors, 0 warnings | ✅ Pass |
| **Type Safety** | No `any` types (TS) | ✅ Pass |
| **Code Size** | <500 lines per Rust module | ✅ Pass |
| **Linting** | cargo clippy clean | ✅ Pass |
| **Format** | cargo fmt check | ✅ Pass |

---

## Notes

- **Design system:** 25 screens in `system-design.pen` (Pencil format)
- **Phase plans:** `plans/dattqh/260324-2044-vaultic-mvp-implementation/`
- **Monorepo principle:** YAGNI — no bloat, all deps justified
- **Security:** Zero plaintext on server; offline-first by design
- **Extensibility:** Architecture supports iOS, Android, web (future phases)

---

*Codebase summary generated: 2026-03-25*
*Total codebase size: ~143K tokens, 123 files*
*Phase 1 Status: ✅ Complete*
*Phase 2 Status: ✅ Complete (Crypto Core)*
