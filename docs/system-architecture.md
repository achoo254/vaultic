# Vaultic: System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER DEVICES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Desktop/Laptop                              Mobile (Future)         │
│  ┌────────────────┐                         ┌──────────────┐        │
│  │  Browser Ext   │                         │  Native App  │        │
│  │  (Chrome/FF)   │                         │  (iOS/Droid) │        │
│  │                │                         │              │        │
│  │ ┌────────────┐ │                         └──────────────┘        │
│  │ │ Popup UI   │ │                                                 │
│  │ │ (380x520)  │ │                                                 │
│  │ └────────────┘ │                                                 │
│  │                │                                                 │
│  │ ┌────────────────────────────────────────────────────────┐      │
│  │ │        Local Vault Storage (IndexedDB/SQLite)         │      │
│  │ │  - Encrypted vault items                              │      │
│  │ │  - Sync queue (pending changes)                       │      │
│  │ │  - Device metadata                                    │      │
│  │ │  - Sync state                                         │      │
│  │ └────────────────────────────────────────────────────────┘      │
│  │                │                                                 │
│  │ ┌────────────────────────────────────────────────────────┐      │
│  │ │         Client-Side Encryption Engine                 │      │
│  │ │  ┌───────────────────────────────────────────────┐    │      │
│  │ │  │ Master Password → Argon2id → Master Key      │    │      │
│  │ │  │ Master Key → HKDF → {Enc Key, Auth Key, ...} │    │      │
│  │ │  │ Each Item → AES-256-GCM (individual blobs)   │    │      │
│  │ │  └───────────────────────────────────────────────┘    │      │
│  │ └────────────────────────────────────────────────────────┘      │
│  │                │                                                 │
│  │         HTTPS (encrypted channel)                               │
│  │                │                                                 │
│  └────────────────┘                                                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓ (Cloud Sync Optional)
                        ┌───────────────┐
                        │  VAULTIC API  │
                        │   (Axum)      │
                        └───────────────┘
                                │
                ┌───────────────┼───────────────┐
                ↓               ↓               ↓
         ┌──────────────┐ ┌──────────┐ ┌──────────────┐
         │  Auth        │ │  Sync    │ │  Share       │
         │  Endpoints   │ │  Relay   │ │  Broker      │
         └──────────────┘ └──────────┘ └──────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                                ↓
                        ┌──────────────────┐
                        │  PostgreSQL 16   │
                        │  (Encrypted DB)  │
                        └──────────────────┘
```

---

## Component Architecture

### Layer 1: Client (TypeScript)

#### 1.1 UI Layer (`@vaultic/ui` + `@vaultic/extension`)
```
┌─────────────────────────────────────────────────┐
│              Extension Popup (React)             │
│              380×520px fixed size                │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐   │
│  │  Header: Search + Settings                │   │
│  ├──────────────────────────────────────────┤   │
│  │  List: Vault Items (name, URL, type)     │   │
│  │  - Quick copy to clipboard               │   │
│  │  - Click to reveal password              │   │
│  ├──────────────────────────────────────────┤   │
│  │  Actions: Add Item, Collections, Sync    │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Design Tokens (SINGLE SOURCE OF TRUTH)        │
│  @vaultic/ui/styles/design-tokens.ts           │
│  - Colors, typography, spacing, icons          │
└─────────────────────────────────────────────────┘
```

**Responsibility:**
- Render vault list with search
- Item details (view/edit modal)
- Settings & sync toggle
- Generate passwords

**Files:**
- `packages/extension/src/entrypoints/popup/` — React components
- `packages/ui/src/components/` — Shared UI library
- `packages/ui/src/styles/design-tokens.ts` — Tokens (no hardcoding)

#### 1.2 Content Script (`@vaultic/extension`)
```
┌─────────────────────────────────────────────────┐
│       Content Script (Runs in web page)         │
├─────────────────────────────────────────────────┤
│  1. Detect login forms (username/password)      │
│  2. Detect signup forms (generate password)     │
│  3. Message service worker for encryption       │
│  4. Inject auto-fill action into DOM            │
│  5. Listen for user interaction (click)         │
└─────────────────────────────────────────────────┘
```

**Responsibility:**
- DOM scanning for forms
- User gesture detection (click)
- Communication with background service worker
- Auto-fill injection (Phase 6)

#### 1.3 Service Worker (`@vaultic/extension`)
```
┌──────────────────────────────────────────────────┐
│    Background Service Worker (Persistent)       │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │  Message Router                            │  │
│  │  - Popup ↔ Content Script ↔ Web APIs      │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  Vault Manager                             │  │
│  │  - Load vault from storage                 │  │
│  │  - Cache in memory (encrypted)             │  │
│  │  - Sync trigger listener                   │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  Crypto Operations                         │  │
│  │  - Decrypt items on-demand                 │  │
│  │  - Key derivation (master password)        │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  Sync Coordinator                          │  │
│  │  - Trigger sync on timer                   │  │
│  │  - Queue local changes                     │  │
│  │  - Apply remote deltas                     │  │
│  │  - Conflict resolution (LWW)               │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Responsibility:**
- Request handling (popup, content script)
- Cache vault in memory
- Trigger sync on interval
- No plaintext persistence

#### 1.4 Storage Abstraction (`@vaultic/storage`)
```
┌──────────────────────────────────────────────┐
│     VaultStore Interface (abstraction)        │
├──────────────────────────────────────────────┤
│  - getItem(id): Promise<VaultItem>           │
│  - setItem(item): Promise<void>              │
│  - deleteItem(id): Promise<void>             │
│  - getAll(): Promise<VaultItem[]>            │
│  - clearAll(): Promise<void>                 │
│  - registerSyncQueue(queue): Promise<void>   │
└──────────────────────────────────────────────┘
           ↓                      ↓
┌──────────────────────┐  ┌──────────────────┐
│  IndexedDB Store     │  │  Memory Store    │
│  (Production)        │  │  (Testing)       │
├──────────────────────┤  ├──────────────────┤
│ - Persistent local   │  │ - RAM only       │
│ - Encrypted at rest  │  │ - Clears on exit │
│ - Survives reload    │  │ - For unit tests │
└──────────────────────┘  └──────────────────┘
```

**Responsibility:**
- Abstract storage backend
- CRUD operations on vault items
- Sync queue management
- No encryption (handled by crypto layer)

**Files:**
- `packages/storage/src/vault-store.ts` — Interface
- `packages/storage/src/indexeddb-store.ts` — IndexedDB impl
- `packages/storage/src/sync-queue.ts` — Delta queue

#### 1.5 Encryption Layer (`@vaultic/crypto`)
```
┌─────────────────────────────────────────────┐
│       Crypto Engine (WebCrypto API)         │
├─────────────────────────────────────────────┤
│                                              │
│  Key Derivation                             │
│  ┌────────────────────────────────────────┐ │
│  │ Master Password + Salt                 │ │
│  │  ↓                                     │ │
│  │ Argon2id (memory-hard, slow)          │ │
│  │  ↓                                     │ │
│  │ Master Key (256-bit)                  │ │
│  │  ↓                                     │ │
│  │ HKDF (multi-purpose derivation)       │ │
│  │  ↓                                     │ │
│  │ {Enc Key, Auth Key, IV Salt, ...}     │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Encryption                                 │
│  ┌────────────────────────────────────────┐ │
│  │ VaultItem (JSON)                       │ │
│  │  ↓                                     │ │
│  │ Serialize (JSON.stringify)             │ │
│  │  ↓                                     │ │
│  │ AES-256-GCM encrypt (SubtleCrypto)    │ │
│  │  ↓                                     │ │
│  │ Ciphertext + Nonce (base64)           │ │
│  └────────────────────────────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
```

**Responsibility:**
- Argon2id key derivation (via argon2-browser)
- HKDF for multi-purpose keys
- AES-256-GCM encryption/decryption
- No key storage (generated on-the-fly from password)

**Files:**
- `packages/crypto/src/kdf.ts` — Argon2id + HKDF
- `packages/crypto/src/cipher.ts` — AES-256-GCM
- `packages/crypto/src/password-gen.ts` — Secure generation

#### 1.6 Sync Engine (`@vaultic/sync`)
```
┌─────────────────────────────────────────────┐
│        Sync Engine (Offline-first)          │
├─────────────────────────────────────────────┤
│                                              │
│  1. Local Changes                           │
│  ┌────────────────────────────────────────┐ │
│  │ Item modified → Queue delta locally    │ │
│  │ Delta = {id, timestamp, encrypted}    │ │
│  │ Persisted in SyncQueue                 │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  2. Push (Device → Server)                  │
│  ┌────────────────────────────────────────┐ │
│  │ Read SyncQueue                         │ │
│  │ POST /sync/push {deltas, device_id}   │ │
│  │ Server ACK → clear queue               │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  3. Pull (Server → Device)                  │
│  ┌────────────────────────────────────────┐ │
│  │ GET /sync/pull {since_timestamp}      │ │
│  │ Receive remote deltas                  │ │
│  │ Apply with conflict resolver           │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  4. Conflict Resolution (LWW)               │
│  ┌────────────────────────────────────────┐ │
│  │ Local item modified 10:00              │ │
│  │ Remote item modified 10:05             │ │
│  │  → Remote wins (last-write)            │ │
│  │ Resolver: timestamp comparison         │ │
│  └────────────────────────────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
```

**Responsibility:**
- Track local changes (timestamp)
- Queue deltas for push
- Fetch & merge remote deltas
- LWW conflict resolution
- Device tracking (multi-device sync)

**Files:**
- `packages/sync/src/sync-engine.ts` — Main logic
- `packages/sync/src/conflict-resolver.ts` — LWW strategy
- `packages/sync/src/device.ts` — Device identity

#### 1.7 API Client (`@vaultic/api`)
```
┌────────────────────────────────────────────────┐
│         API Client (ofetch wrapper)            │
├────────────────────────────────────────────────┤
│  Base: https://api.vaultic.com                 │
│                                                 │
│  Auth: POST /auth/register                     │
│        POST /auth/login                        │
│        POST /auth/refresh                      │
│        POST /auth/logout                       │
│                                                 │
│  Sync: POST /sync/pull                         │
│        POST /sync/push                         │
│        GET  /sync/status                       │
│                                                 │
│  Share: POST /share/create                     │
│         GET  /share/:link_id                   │
│         DELETE /share/:link_id                 │
│                                                 │
│  Headers: Authorization: Bearer <jwt>         │
│           Content-Type: application/json      │
│                                                 │
└────────────────────────────────────────────────┘
```

**Responsibility:**
- HTTP requests (ofetch)
- Auth token management
- Error handling & retry logic
- Type-safe request/response

**Files:**
- `packages/api/src/client.ts` — Base HTTP client
- `packages/api/src/auth-api.ts` — /auth/* endpoints
- `packages/api/src/sync-api.ts` — /sync/* endpoints
- `packages/api/src/share-api.ts` — /share/* endpoints

---

### Layer 2: Server (Rust)

#### 2.1 API Server (`vaultic-server`)
```
┌──────────────────────────────────────────────┐
│         Axum HTTP Server                      │
│         Port: 8080 (dev) / 443 (prod)        │
├──────────────────────────────────────────────┤
│                                               │
│  Router                                      │
│  ├── POST   /auth/register                   │
│  ├── POST   /auth/login                      │
│  ├── POST   /auth/refresh                    │
│  ├── POST   /auth/logout                     │
│  ├── GET    /auth/me (protected)             │
│  │                                           │
│  ├── POST   /sync/pull (protected)           │
│  ├── POST   /sync/push (protected)           │
│  ├── GET    /sync/status (protected)         │
│  │                                           │
│  ├── POST   /share/create (protected)        │
│  ├── GET    /share/:link_id                  │
│  └── DELETE /share/:link_id (protected)      │
│                                               │
│  Middleware                                  │
│  ├── CORS (restrict to extension origin)    │
│  ├── Auth (JWT token verification)          │
│  ├── Logging (structured logs)              │
│  ├── Error handling (JSON responses)        │
│  └── Rate limiting (100 req/min on /auth)  │
│                                               │
└──────────────────────────────────────────────┘
```

**Responsibility:**
- HTTP request routing
- Request/response validation
- Auth token verification
- Rate limiting

**Files:**
- `crates/vaultic-server/src/main.rs` — Server setup
- `crates/vaultic-server/src/routes/` — Handler functions
- `crates/vaultic-server/src/middleware/` — Middleware
- `crates/vaultic-server/src/error.rs` — Error types

#### 2.2 Database Layer (`vaultic-migration` + SeaORM)
```
┌──────────────────────────────────────────────┐
│         PostgreSQL 16 Database                │
├──────────────────────────────────────────────┤
│                                               │
│  Tables                                      │
│  ├── users                                   │
│  │   ├── id (UUID)                          │
│  │   ├── email (unique)                     │
│  │   ├── password_hash (Argon2id)           │
│  │   ├── created_at                         │
│  │   └── updated_at                         │
│  │                                           │
│  ├── sync_deltas                            │
│  │   ├── id (UUID)                          │
│  │   ├── user_id (FK)                       │
│  │   ├── device_id (device identifier)      │
│  │   ├── item_id (vault item ID)            │
│  │   ├── encrypted_delta (ciphertext)       │
│  │   ├── timestamp                          │
│  │   └── synced_at (NULL until ACK)         │
│  │                                           │
│  ├── share_links                            │
│  │   ├── id (UUID)                          │
│  │   ├── user_id (FK)                       │
│  │   ├── encrypted_item (ciphertext)        │
│  │   ├── share_password (hashed)            │
│  │   ├── expires_at                         │
│  │   ├── view_count / view_limit            │
│  │   └── created_at                         │
│  │                                           │
│  └── sessions                               │
│      ├── id (UUID)                          │
│      ├── user_id (FK)                       │
│      ├── jwt_token (encrypted)              │
│      ├── expires_at                         │
│      └── created_at                         │
│                                               │
└──────────────────────────────────────────────┘
```

**Responsibility:**
- User registration/login
- Sync delta storage (encrypted)
- Share link management
- Session/token tracking

**Files:**
- `crates/vaultic-migration/src/lib.rs` — SeaORM migrations

#### 2.3 Crypto (Rust) (`vaultic-crypto`)
```
┌──────────────────────────────────────────────┐
│    Rust Crypto Primitives                    │
├──────────────────────────────────────────────┤
│                                               │
│  Key Derivation                              │
│  ├── Argon2id (argon2 crate)                │
│  │   ├── Memory: 64 MiB                     │
│  │   ├── Time cost: 3 iterations            │
│  │   ├── Parallelism: 4                     │
│  │   └── Hash: 32 bytes (256-bit)           │
│  └── HKDF-SHA256 (hkdf + sha2 crates)       │
│      ├── Domain sep: "vaultic-enc"          │
│      ├── Domain sep: "vaultic-auth"         │
│      └── Expand: 32-byte output per key     │
│                                               │
│  Encryption                                  │
│  ├── AES-256-GCM (aes-gcm crate)           │
│  │   ├── 256-bit key                       │
│  │   ├── 96-bit nonce (random per msg)     │
│  │   ├── 128-bit auth tag                  │
│  │   └── Format: nonce || ciphertext || tag│
│  └── Random number gen (rand crate)        │
│      └── Cryptographically secure CSPRNG   │
│                                               │
│  Password Generation                        │
│  ├── CSPRNG: rand::thread_rng()             │
│  ├── Configurable: 8–128 chars              │
│  └── Options: upper, lower, digits, symbols│
│                                               │
│  Type Safety                                 │
│  ├── MasterKey: Zeroize on drop             │
│  ├── EncryptionKey: Zeroize on drop         │
│  └── AuthHash: Zeroize on drop              │
│                                               │
└──────────────────────────────────────────────┘
```

**Responsibility:**
- Argon2id key derivation (password → master key)
- HKDF key expansion (master key → per-purpose keys)
- AES-256-GCM encryption/decryption (individual vault items)
- Secure password generation (configurable entropy)
- Type-safe key handling with automatic memory zeroization
- Used by both server (validation) and client (WebCrypto bridge)

**Exports:**
- `derive_master_key(password, email) → MasterKey`
- `derive_encryption_key(master_key) → EncryptionKey`
- `derive_auth_hash(master_key) → AuthHash`
- `encrypt(key, plaintext) → Vec<u8>`
- `decrypt(key, data) → Vec<u8>`
- `generate_password(options) → String`
- `generate_share_key() → ShareKey`

**Files:**
- `crates/vaultic-crypto/src/types.rs` — Key types (MasterKey, EncryptionKey, AuthHash)
- `crates/vaultic-crypto/src/error.rs` — CryptoError enum
- `crates/vaultic-crypto/src/kdf.rs` — Argon2id + HKDF
- `crates/vaultic-crypto/src/cipher.rs` — AES-256-GCM
- `crates/vaultic-crypto/src/password_gen.rs` — Secure password generation

#### 2.4 Shared Types (`vaultic-types`)
```
┌──────────────────────────────────────────────┐
│    Rust Type Definitions (serde-enabled)    │
├──────────────────────────────────────────────┤
│                                               │
│  user.rs                                     │
│  ├── User {id, email, created_at}          │
│  ├── LoginRequest {email, password}         │
│  └── LoginResponse {token, refresh_token}  │
│                                               │
│  vault.rs                                    │
│  ├── VaultItem {id, type, title, ...}      │
│  ├── VaultItemType (password, note, card)  │
│  └── VaultItemEncrypted {ciphertext, ...}  │
│                                               │
│  sync.rs                                     │
│  ├── Delta {id, timestamp, encrypted}      │
│  ├── SyncRequest {deltas, device_id}       │
│  └── SyncResponse {deltas, server_time}    │
│                                               │
│  share.rs                                    │
│  ├── ShareLink {id, encrypted_item, ...}   │
│  ├── ShareRequest {item, password, exp}    │
│  └── ShareResponse {link_id, link_url}     │
│                                               │
└──────────────────────────────────────────────┘
```

**Responsibility:**
- Type definitions (JSON serializable via serde)
- Used in API contracts
- Mirrored in TypeScript (`packages/types/`)

**Files:**
- `crates/vaultic-types/src/user.rs`
- `crates/vaultic-types/src/vault.rs`
- `crates/vaultic-types/src/sync.rs`
- `crates/vaultic-types/src/share.rs`

---

### Layer 3: Infrastructure

#### 3.1 Docker Deployment
```
┌───────────────────────────────────────────────┐
│         Docker Compose (Production)           │
├───────────────────────────────────────────────┤
│                                                │
│  Services                                     │
│  ├── vaultic-server                          │
│  │   ├── Image: vaultic:latest               │
│  │   ├── Port: 8080 (exposed as 443 via nginx) │
│  │   ├── Env: DB_URL, JWT_SECRET, etc.      │
│  │   └── Healthcheck: GET /health           │
│  │                                            │
│  ├── postgres                                │
│  │   ├── Image: postgres:16-alpine          │
│  │   ├── Port: 5432 (local only)            │
│  │   ├── Volume: /var/lib/postgresql/data  │
│  │   └── Env: POSTGRES_PASSWORD, DB_NAME   │
│  │                                            │
│  └── nginx (future)                          │
│      ├── TLS termination (rustls-capable)   │
│      ├── Port: 443                          │
│      └── Proxies to vaultic-server:8080    │
│                                                │
│  Networks                                    │
│  └── internal (vaultic ↔ postgres)          │
│      └── Not exposed to host                │
│                                                │
└───────────────────────────────────────────────┘
```

**Files:**
- `docker/Dockerfile` — Multi-stage build
- `docker/docker-compose.yml` — Service definitions

#### 3.2 CI/CD Pipeline (GitLab CI)
```
┌───────────────────────────────────────────────┐
│       GitLab CI Pipeline (.gitlab-ci.yml)    │
├───────────────────────────────────────────────┤
│                                                │
│  1. Build Stage                               │
│  ├── cargo build --release                   │
│  ├── pnpm build                              │
│  └── docker build (multi-stage)              │
│                                                │
│  2. Test Stage                                │
│  ├── cargo test --workspace                  │
│  ├── pnpm test                               │
│  └── clippy + fmt checks                     │
│                                                │
│  3. Security Stage                            │
│  ├── cargo audit (dependencies)              │
│  ├── npm audit                               │
│  └── SAST scanning (optional)                │
│                                                │
│  4. Deploy Stage (main branch only)          │
│  └── Push to registry (gitlabs.inet.vn)     │
│      Docker pull + compose restart           │
│                                                │
└───────────────────────────────────────────────┘
```

**Files:**
- `.gitlab-ci.yml` — Pipeline configuration

---

## Data Flow: User Registration → Sync

```
1. USER REGISTRATION
┌────────────────────────────────────────────────────┐
│ Client                          Server             │
├────────────────────────────────────────────────────┤
│ Input: email, master password                      │
│  ↓                                                 │
│ salt = random(16 bytes)                           │
│ key = Argon2id(password, salt) → master key       │
│  ↓                                                 │
│ {Enc Key, Auth Key} = HKDF(key)                   │
│  ↓                                                 │
│ POST /auth/register                               │
│ {email, password_hash, salt}  ──────────→         │
│                               ← ────── {token}    │
│                                                    │
│                                    password_hash = │
│                                    Argon2id(       │
│                                    password,       │
│                                    server_salt)    │
│                                                    │
│ Master Key encrypted in local storage             │
│ (NOT sent to server)                              │
└────────────────────────────────────────────────────┘

2. VAULT ITEM CREATION (LOCAL)
┌────────────────────────────────────────────────────┐
│ Extension                       Storage            │
├────────────────────────────────────────────────────┤
│ User creates password item                        │
│  ↓                                                 │
│ plaintext = {                                     │
│   "title": "Gmail",                              │
│   "username": "user@gmail.com",                  │
│   "password": "secure123"                        │
│ }                                                 │
│  ↓                                                 │
│ ciphertext = AES-256-GCM(plaintext, enc_key)    │
│  ↓                                                 │
│ setItem({                                        │
│   id: uuid(),                                    │
│   ciphertext: "...",                             │
│   timestamp: now()                               │
│ })                                                │
│  ↓                                                 │
│ Queue delta in SyncQueue                         │
│  ├── {item_id, encrypted_delta, timestamp}      │
│  └── Persisted locally (IndexedDB)              │
│                                                   │
│ Vault accessible offline ✓                        │
│ Server has zero knowledge ✓                       │
└────────────────────────────────────────────────────┘

3. SYNC PUSH (Device → Server)
┌────────────────────────────────────────────────────┐
│ Client                          Server             │
├────────────────────────────────────────────────────┤
│ Sync triggered (timer or manual)                  │
│  ↓                                                 │
│ Fetch SyncQueue (local deltas)                    │
│  ↓                                                 │
│ POST /sync/push                                   │
│ {                    ──────────→                   │
│   deltas: [                      INSERT INTO       │
│     {id, encrypted, timestamp}   sync_deltas      │
│   ],                                               │
│   device_id: "device-uuid"       timestamp       │
│ }                                check            │
│                    ← ────────     {synced: true}  │
│                                                    │
│ Clear SyncQueue                                   │
│ Update last_sync_time                            │
│                                                    │
│ Note: Server stores ciphertext only              │
│ Server cannot decrypt (no master key)            │
└────────────────────────────────────────────────────┘

4. SYNC PULL (Server → Device 2)
┌────────────────────────────────────────────────────┐
│ Device 2                        Server             │
├────────────────────────────────────────────────────┤
│ GET /sync/pull                                     │
│ {since: "2026-03-25T10:00Z"}  ──────────→         │
│                    ← ────────  {                   │
│                              deltas: [           │
│                                {id, ciphertext,  │
│                                timestamp, from:  │
│                                "device-uuid"}    │
│                              ]                    │
│                            }                      │
│  ↓                                                 │
│ Apply deltas:                                    │
│  1. Fetch local version (if exists)              │
│  2. Compare timestamps (LWW logic)               │
│  3. If remote newer: decrypt + merge             │
│  4. Update local storage                         │
│                                                    │
│ Vault on Device 2 now in sync ✓                   │
│ No decryption on server ✓                         │
└────────────────────────────────────────────────────┘
```

---

## Encryption Guarantees

```
┌─────────────────────────────────────────────────┐
│         ENCRYPTION SECURITY MODEL               │
├─────────────────────────────────────────────────┤
│                                                  │
│ Master Password (user secret, never sent)      │
│   ↓                                             │
│ Argon2id(password, email as salt)               │
│   ├── Memory: 64 MiB (65536 KiB)                │
│   ├── Time cost: 3 iterations                   │
│   ├── Parallelism: 4                            │
│   ├── Output: 256-bit master key                │
│   └── Brute-force resistant (OWASP compliant)   │
│   ↓                                             │
│ Master Key (256-bit, Zeroize on drop)          │
│   ├── Never stored                              │
│   ├── Never sent to server                      │
│   ├── Regenerated on each login                │
│   ├── Automatically zeroed from memory          │
│   └── Protected from memory dumps               │
│   ↓                                             │
│ HKDF-SHA256 Expansion (IKM = master key)       │
│   ├── Enc key: HKDF(mk, info="vaultic-enc")    │
│   ├── Auth hash: HKDF(mk, info="vaultic-auth") │
│   ├── Domain separation prevents key reuse      │
│   └── Each key: 256-bit output                  │
│   ↓                                             │
│ AES-256-GCM per item                           │
│   ├── Key: 256-bit encryption key               │
│   ├── Nonce: 96-bit random (per message)        │
│   ├── Format: nonce || ciphertext || tag        │
│   ├── Authentication: 128-bit auth tag          │
│   └── Integrity verified on decrypt             │
│                                                  │
│ Authentication to Server:                       │
│   ├── Client: Sends auth_hash (not password)    │
│   ├── Server: Cannot derive encryption key      │
│   ├── Auth hash: 2nd hash of HKDF output        │
│   └── Original HKDF output never exposed        │
│                                                  │
│ Result: Server has ZERO plaintext ✓             │
│         Only ciphertext + auth hash stored      │
│         No server-side key = no decryption     │
│         Memory safety: keys zeroized on drop    │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Offline-First Design

```
┌──────────────────────────────────────────────────┐
│        OFFLINE-FIRST VAULT ACCESS                │
├──────────────────────────────────────────────────┤
│                                                   │
│ Scenario 1: First Login (Online)                │
│   User enters master password                    │
│   → Derive master key                            │
│   → Load vault from local storage (encrypted)   │
│   → Decrypt items on-demand                     │
│   ✓ Works offline immediately after login       │
│                                                   │
│ Scenario 2: No Internet                         │
│   Browser loses connection                       │
│   → Vault remains accessible                     │
│   → All operations local (no sync)              │
│   → Changes queued for later push               │
│   ✓ User can still view, edit, copy passwords  │
│                                                   │
│ Scenario 3: Sync Enabled (Optional)            │
│   User toggles "Cloud Sync" in Settings        │
│   → Background service worker syncs on timer    │
│   → Delta protocol (only changes)               │
│   → Multi-device sync via server relay          │
│   ✓ Offline-first: sync is best-effort         │
│                                                   │
│ Scenario 4: Sync Disabled (Default)            │
│   Cloud Sync OFF                                 │
│   → No sync to server                           │
│   → Vault local-only                            │
│   → Share links work (independent)              │
│   ✓ Zero data on server (except auth)          │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## Scalability Considerations

| Component | Current | Bottleneck | Solution |
|-----------|---------|------------|----------|
| **Storage (Client)** | IndexedDB | 50MB per browser | Desktop/mobile use SQLite |
| **Crypto (Key Derivation)** | 1s (Argon2id) | Slow on weak CPU | Accept, offload to background |
| **Sync (Delta Protocol)** | 100 items / pull | Large item count | Pagination, cursor-based sync |
| **Server (Axum)** | Single instance | Concurrent users | Add load balancer + multiple instances |
| **Database (PostgreSQL)** | Local dev | Disk I/O | Use managed DB (AWS RDS, etc.) |
| **Share Links** | Single server | No caching | Add Redis for share metadata |

---

## Security Checklist

- [x] Master password never sent to server
- [x] Master key never persisted (regenerated from password)
- [x] Vault items encrypted individually (AES-256-GCM)
- [x] Argon2id slow (resistant to brute-force)
- [x] HKDF multi-purpose keys (isolation)
- [x] CORS restricted (extension origin)
- [x] JWT short-lived (24h, refresh rotation)
- [x] HTTPS only (enforced in production)
- [x] No plaintext logs
- [x] Database encrypted at rest (optional)

---

## Development Roadmap

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Monorepo setup | ✅ Complete |
| 2 | Crypto (Rust) | ✅ Complete |
| 3 | API server + DB | Pending |
| 4 | Extension shell + Auth | Pending |
| 5 | Vault CRUD + Sync | Pending |
| 6 | Autofill + Content script | Pending |
| 7 | Secure Share | Pending |
| 8 | Polish + CI/CD | Pending |

---

*Document updated: 2026-03-25*
*Phase 1 Status: Complete*
*Phase 2 Status: Complete (Crypto Core)*
