# Vaultic: System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│              USER DEVICES (Client-Side)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Browser Extension (Chrome/Firefox)                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Popup UI (380×520px)                             │ │
│  │  ├─ Vault search & item management               │ │
│  │  ├─ Settings (sync toggle, export/import)        │ │
│  │  └─ Auto-fill credentials (content script)       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Local Storage & Crypto                                │
│  ├─ IndexedDB vault (encrypted items + sync queue)    │
│  ├─ WebCrypto API (AES-256-GCM, Argon2id)            │
│  └─ Key derivation (no plaintext storage)             │
│                                                         │
│  HTTPS ↔ Vaultic API (Optional Cloud Sync)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓ (Cloud Sync Optional)
        ┌────────────────────────────────────┐
        │  VAULTIC API (Node.js/Express)     │
        │  Port 8080 / https://api.vaultic   │
        ├────────────────────────────────────┤
        │  • Auth (register, login, refresh) │
        │  • Sync (push/pull deltas)         │
        │  • Share (create encrypted links)  │
        │  • Health probes                   │
        └────────────────────────────────────┘
                    │    │    │
        ┌───────────┼────┼────┴──────────┐
        │ Mongoose  │    │               │
        ↓           │    │               │
    ┌─────────────┐ │    │         ┌──────────┐
    │  MongoDB    │ │    └────────→│ Rate     │
    │  (external) │ │               │ Limiter  │
    │             │ │               └──────────┘
    │ • users     │ │
    │ • vault     │ ├──────────────→ JWT Auth
    │   items     │ │
    │ • folders   │ └──────────────→ Error
    │ • shares    │                  Handler
    └─────────────┘
```

---

## System Layers

### Layer 1: Client (Browser Extension)

#### 1.1 Popup UI (`@vaultic/extension`)
- **Location:** `client/apps/extension/src/entrypoints/popup/`
- **Framework:** React 18 + Tailwind CSS
- **Size:** Fixed 380×520px
- **Features:**
  - SetupPasswordForm (offline vault creation, no account)
  - Vault item list with search
  - Item CRUD (create, read, update, delete)
  - Settings (sync toggle, account upgrade, export/import)
  - Password generator
  - Security health check

**Routing Logic (`vaultState`):**
```typescript
type VaultState = 'no_vault' | 'locked' | 'unlocked'
- no_vault: First run → SetupPasswordForm (create offline vault)
- locked: Password protected (inactivity timeout or browser reload)
- unlocked: Vault accessible → VaultList + navigation
```

**Responsibilities:**
- Render UI with design tokens
- User input handling
- Display decrypted vault items
- Message background service worker
- Route based on vaultState (offline-first aware)

#### 1.2 Content Script (`@vaultic/extension`)
- **Location:** `client/apps/extension/src/entrypoints/content.ts`
- **Executes:** In web page context
- **Triggered:** On page load

**Responsibilities:**
- Detect login/signup forms (DOM scanning)
- Suggest auto-fill on recognized domains
- Message background worker for credentials
- Inject password generator on signup

#### 1.3 Service Worker (`@vaultic/extension`)
- **Location:** `client/apps/extension/src/entrypoints/background.ts`
- **Scope:** Extension-wide background process
- **Persistence:** Survives page unload

**Responsibilities:**
- Route messages (popup ↔ content script)
- Manage encryption/decryption
- Cache vault in memory
- Trigger sync periodically
- Handle token refresh
- No plaintext on disk

#### 1.4 Encryption Engine (`@vaultic/crypto`)
**Key Derivation (Online):**
```
Master Password
  ↓ + email (salt)
Argon2id (64MB, t=3, p=4)
  ↓
Master Key (256-bit, never sent)
  ↓ HKDF-SHA256
{Enc Key, Auth Key, ...}
```

**Key Derivation (Offline):**
```
Master Password
  ↓ + random salt (stored in VaultConfig)
Argon2id (64MB, t=3, p=4) — deriveMasterKeyWithSalt()
  ↓
Master Key (256-bit, never sent)
  ↓ HKDF-SHA256
{Enc Key, Auth Key/authHashVerifier}
```

**VaultConfig Type** (`shared/types/vault-config.ts`):
```typescript
interface VaultConfig {
  mode: 'offline' | 'online'
  salt: string               // Base64 Argon2id salt
  authHashVerifier: string   // SHA256(encryption_key) for offline password check
  createdAt: number
  email?: string             // Online only
  userId?: string            // Online only
}
```

**Encryption:**
```
VaultItem (JSON)
  ↓
AES-256-GCM encrypt (WebCrypto)
  ↓
Ciphertext (base64 + random nonce)
```

**Files:**
- `client/packages/crypto/src/kdf.ts` — Key derivation
- `client/packages/crypto/src/cipher.ts` — Encryption/decryption
- `client/packages/crypto/src/password-gen.ts` — Secure generation

#### 1.5 Storage Abstraction (`@vaultic/storage`)
**Interface (User-Scoped):**
```typescript
interface VaultStore {
  // Vault items (all methods require userId for profile isolation)
  getItem(userId: string, id: string): Promise<VaultItem | null>
  putItem(item: VaultItem): Promise<void>
  deleteItem(userId: string, id: string): Promise<void>
  getAllItems(userId: string): Promise<VaultItem[]>
  getAllItemsUnfiltered(): Promise<VaultItem[]>
  getChangedSince(userId: string, timestamp: number): Promise<VaultItem[]>

  // Folders (user-scoped)
  getFolder(userId: string, id: string): Promise<Folder | null>
  putFolder(folder: Folder): Promise<void>
  deleteFolder(userId: string, id: string): Promise<void>
  getAllFolders(userId: string): Promise<Folder[]>
  getAllFoldersUnfiltered(): Promise<Folder[]>

  // Bulk operations
  clear(userId?: string): Promise<void>
}
```

**Note:** All methods except `putItem`, `putFolder`, and `clear(undefined)` require `userId` for data isolation. Each user's vault is completely isolated at the storage layer.

**Implementations:**
- **IndexedDB Store** (Production) — Persistent, survives reload
- **Memory Store** (Testing) — RAM only, for unit tests

**Responsibilities:**
- CRUD vault items locally
- Manage sync queue
- No encryption (crypto layer handles)

**Files:**
- `client/packages/storage/src/vault-store.ts` — Interface
- `client/packages/storage/src/indexeddb-store.ts` — IndexedDB impl

#### 1.6 Sync Engine (`@vaultic/sync`)
**Constructor (User-Aware):**
```typescript
new SyncEngine(
  store: VaultStore,
  queue: SyncQueue,
  api: SyncApiAdapter,
  resolver: ConflictResolver,
  userId: string  // 5th parameter for user isolation
)
```

**Delta Sync Flow:**
1. User modifies item locally
2. Service worker creates delta (id, timestamp, encrypted, user_id)
3. Delta queued in SyncQueue (per-user)
4. On interval or manually:
   - **Push:** Send queued deltas to `/sync/push` (includes user_id)
   - **Pull:** Fetch remote deltas from `/sync/pull` (user_id from auth)
   - **Merge:** Apply remote with LWW resolution
   - **ACK:** Clear queue on success

**Conflict Resolution (Last-Write-Wins):**
- Local item timestamp: 10:00
- Remote item timestamp: 10:05
- Result: Remote wins (newer timestamp)
- Strategy: Timestamp comparison

**Files:**
- `client/packages/sync/src/sync-engine.ts` — Main logic
- `client/packages/sync/src/conflict-resolver.ts` — LWW strategy

#### 1.7 API Client (`@vaultic/api`)
**Transport:** ofetch (lightweight HTTP client)

**Endpoints:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

POST /api/v1/sync/push
POST /api/v1/sync/pull
GET  /api/v1/sync/status

POST /api/v1/shares/create
GET  /api/v1/shares/:id
DELETE /api/v1/shares/:id
```

**Files:**
- `client/packages/api/src/client.ts` — Base HTTP client
- `client/packages/api/src/auth-api.ts` — Auth endpoints
- `client/packages/api/src/sync-api.ts` — Sync endpoints
- `client/packages/api/src/share-api.ts` — Share endpoints

### Layer 2: Backend (Node.js/Express)

#### 2.1 Server Entry Point (`backend/src/server.ts`)
```typescript
- Express app initialization
- MongoDB connection
- Middleware stack (CORS, body parser, logger, rate limiter)
- Route registration
- Error handler
- Graceful shutdown (SIGTERM/SIGINT)
- Pino logger setup
```

**Environment variables:**
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secret for token signing
- `SERVER_PORT` — Port (default 8080)
- `CORS_ORIGIN` — CORS whitelist
- `LOG_LEVEL` — Pino log level

#### 2.2 Routes (REST API)

**Auth Routes** (`backend/src/routes/auth-route.ts`)
```typescript
POST /api/v1/auth/register
  Input: { email, password }
  Output: { user: User, token: JWT }

POST /api/v1/auth/login
  Input: { email, password }
  Output: { user: User, token: JWT }

POST /api/v1/auth/refresh
  Input: { refreshToken }
  Output: { accessToken: JWT }

GET /api/v1/auth/me (protected)
  Output: { user: User }
```

**Sync Routes** (`backend/src/routes/sync-route.ts`)
```typescript
POST /api/v1/sync/push (protected)
  Input: { deltas: Delta[], deviceId }
  Output: { ack: boolean }

POST /api/v1/sync/pull (protected)
  Input: { since: timestamp }
  Output: { deltas: Delta[] }

GET /api/v1/sync/status (protected)
  Output: { lastSync: timestamp, queueSize: number }
```

**Share Routes** (`backend/src/routes/share-route.ts`)
```typescript
POST /api/v1/shares/create (protected)
  Input: { encData, expiresAt, maxViews }
  Output: { linkId, shareUrl }

GET /api/v1/shares/:linkId
  Output: { encData, expiresAt } (public, no auth)

GET /api/v1/shares/:linkId/metadata (authOptional)
  Output: { viewCount, maxViews, expiresAt } (public metadata)
  Note: Encrypted data stays in URL fragment (never to server)

DELETE /api/v1/shares/:linkId (protected)
  Output: { success: boolean }
```

**Health Routes** (`backend/src/routes/health-route.ts`)
```typescript
GET /health
  Output: { status: "ok", timestamp }

GET /api/v1
  Output: { version: "1.0.0", status: "ok" }
```

#### 2.3 Middleware Stack

**Order matters:**
1. CORS (cross-origin requests)
2. Body parser (JSON, URL-encoded 1MB limit)
3. Request logger (Pino HTTP)
4. Rate limiter (100 req/min on auth endpoints)
5. Public routes (health, GET shares)
6. Auth middleware (JWT validation or optional)
7. Protected routes (sync, delete shares)
8. Error handler (global catch-all)

**Key Middleware:**
- `authRequired(req, res, next)` — JWT token validation (throws on missing/invalid)
- `authOptional(req, res, next)` — Optional JWT (sets req.userId if valid, continues if not)
- `error-handler-middleware.ts` — Global error catch
- `rate-limit-middleware.ts` — API throttling
- `request-logger-middleware.ts` — Pino logging

**Note:** Share metadata endpoint uses `authOptional` to allow unauthenticated clients to check view counts while keeping encrypted data client-side (URL fragment).

#### 2.4 Services (Business Logic)

**Auth Service** (`backend/src/services/auth-service.ts`)
```typescript
- register(email, password)
  • Hash password (bcrypt)
  • Create user document
  • Generate JWT token

- login(email, password)
  • Find user by email
  • Verify password
  • Generate JWT token

- refreshToken(refreshToken)
  • Validate refresh token
  • Issue new access token
```

**Sync Service** (`backend/src/services/sync-service.ts`)
```typescript
- pushDeltas(userId, deltas)
  • Validate deltas
  • Persist to MongoDB
  • ACK to client

- pullDeltas(userId, since)
  • Query MongoDB for deltas > timestamp
  • Return encrypted blobs only
```

**Share Service** (`backend/src/services/share-service.ts`)
```typescript
- createShare(userId, encData)
  • Generate unique linkId
  • Store encrypted data
  • Set expiration
  • Return share URL

- getShare(linkId)
  • Lookup by linkId
  • Check expiration & views
  • Return encrypted data
```

#### 2.5 Models (Mongoose Schemas)

**User Model** (`backend/src/models/user-model.ts`)
```typescript
{
  email: String (unique, lowercase),
  passwordHash: String (bcrypt),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**VaultItem Model** (`backend/src/models/vault-item-model.ts`)
```typescript
{
  _id: String,
  userId: String (indexed, required) — User ownership (profile isolation),
  folderId: String | null (optional),
  itemType: String (login|secure_note|card|identity),
  encryptedData: String (base64 AES-256-GCM),
  deviceId: String (required) — Device that created this item,
  version: Number (default 1) — For conflict resolution,
  deletedAt: Date | null (soft delete),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `{ userId: 1, deviceId: 1, updatedAt: 1 }` — Fast sync queries per user

**Folder Model** (`backend/src/models/folder-model.ts`)
```typescript
{
  _id: String,
  userId: String (indexed, required) — User ownership (profile isolation),
  encrypted_name: String (AES-256-GCM encrypted),
  parent_id: String | null (self-ref, optional for nesting),
  created_at: String (ISO),
  updated_at: String (ISO)
}
```

**SecureShare Model** (`backend/src/models/secure-share-model.ts`)
```typescript
{
  linkId: String (unique),
  userId: ObjectId (ref User),
  encData: String (base64),
  accessKey: String (optional password hash),
  expiresAt: Date,
  maxViews: Number,
  viewCount: Number (default 0),
  createdAt: Date (auto)
}
```

#### 2.6 Utilities

**JWT Utils** (`backend/src/utils/jwt-utils.ts`)
```typescript
- generateToken(payload)
  • Sign with JWT_SECRET
  • Set TTL (15min for access, 7d for refresh)

- verifyToken(token)
  • Decode and verify signature
  • Check expiration
  • Return payload

- hashPassword(password)
  • Use bcrypt (salt rounds 10)

- verifyPassword(password, hash)
  • bcrypt.compare
  • Constant-time check
```

**App Error** (`backend/src/utils/app-error.ts`)
```typescript
class AppError extends Error {
  statusCode: number
  code: string
  context?: Record<string, any>
}
```

**Validation** (`backend/src/utils/validate-request.ts`)
```typescript
- validateEmail(email)
- validatePassword(password)
- validateDeltas(deltas)
- (Using Zod schemas)
```

### Layer 3: Database (MongoDB)

**Connection:** External (standalone)
**Collections:**
- `users` — User accounts
- `vaultitems` — Encrypted vault items
- `folders` — Collections (nesting)
- `secureshares` — Encrypted share links

**Indexes:**
- `users.email` (unique)
- `vaultitems.userId` (query by user, primary isolation)
- `vaultitems.userId,deviceId,updatedAt` (composite for sync queries)
- `folders.userId` (query by user)
- `secureshares.linkId` (unique)
- `secureshares.expiresAt` (TTL index for auto-cleanup)

---

## Data Flow Examples

### Example 1: User Registration
```
1. User enters email + password in popup
2. Popup → Service Worker → API Client
3. POST /api/v1/auth/register
4. Backend:
   - Validate email (unique)
   - Hash password (bcrypt)
   - Create user document in MongoDB
   - Sign JWT token
5. Response: { user, token }
6. Service Worker stores token + caches user
7. Popup displays vault (empty initially)
```

### Example 2: Vault Item Creation
```
1. User creates password item in popup
2. Popup → Service Worker
3. Service Worker:
   - Generate random nonce
   - Encrypt item (AES-256-GCM)
   - Store encrypted blob locally (IndexedDB)
   - Create delta (id, timestamp, ciphertext)
   - Queue in SyncQueue
4. User taps "Sync" or auto-sync triggers
5. Service Worker:
   - Read SyncQueue
   - POST /api/v1/sync/push { deltas, deviceId }
   - Backend persists encrypted blobs to MongoDB
   - Returns ACK
6. Service Worker clears SyncQueue
7. Vault still encrypted locally (no plaintext)
```

### Example 3: Auto-Fill on Login
```
1. User visits example.com login page
2. Content Script:
   - Detects login form
   - Sends message to Service Worker: "need password for example.com"
3. Service Worker:
   - Searches vault locally (IndexedDB)
   - Finds matching item by domain
   - Decrypts item (AES-256-GCM)
   - Sends credentials to content script
4. Content Script:
   - Injects username + password into form
   - Submits form
5. No plaintext sent to server (only encrypted storage)
```

### Example 4: Multi-Device Sync
```
Device A (Laptop):
1. User modifies vault item
2. Creates delta, queues locally
3. Syncs: POST /sync/push { deltas, deviceId: "laptop" }

Backend:
1. Receives delta from Device A
2. Stores in VaultItem collection
3. Returns ACK

Device B (Desktop):
1. Auto-sync timer triggers
2. GET /sync/pull { since: lastSyncTime }
3. Backend returns deltas from Device A
4. Conflict resolver (if local change exists):
   - Local timestamp: 14:00
   - Remote timestamp: 14:05
   - Remote wins (newer)
5. Merges remote delta
6. Updates IndexedDB locally

Result: Both devices have latest version
```

---

## Security Model

### Authentication
- Simple password-based (SRP deferred to v0.3)
- Password hashing: bcrypt (10 salt rounds)
- JWT tokens (HS256, 15min access, 7d refresh)
- Token stored in memory (service worker), not localStorage

### Encryption (Client-Side)
- Master password never sent to server
- Argon2id KDF (memory-hard)
- HKDF key derivation
- AES-256-GCM for each item
- Random nonce per encryption

### Server Storage
- Encrypted items only (ciphertext blobs)
- No plaintext passwords
- No decryption capability (server can't decrypt)

### API Security
- CORS restricted to extension origins
- HTTPS required (nginx terminates TLS)
- Rate limiting (100 req/min on auth)
- Input validation (Zod schemas)

---

## Offline-First Design

### Vault Modes

#### 1. Offline Mode (No Account)
**First-run experience (SetupPasswordForm):**
- User enters master password only (no email)
- Random salt generated → stored in VaultConfig
- Master key derived locally (Argon2id + random salt)
- No server registration needed
- All operations local (IndexedDB) — fully offline
- Can enable Cloud Sync later by upgrading account (Settings → Create Account)

**Account Upgrade Flow:**
1. User in offline vault opens Settings → "Create Account"
2. User enters email + re-enters master password (for auth_hash derivation)
3. POST /auth/register with new email
4. Backend creates account using email as salt (standard flow)
5. VaultConfig updated: mode='online', email set, userId set
6. Sync becomes available

#### 2. Online Mode (After Registration/Login)
- Email-based account
- Email used as Argon2id salt (deterministic)
- Cloud Sync toggle in Settings
- Can enable/disable sync per-device

**Without Cloud Sync:**
- All operations local (IndexedDB)
- No server call required
- Vault works 100% offline (even after login)
- No sync queue created

**With Cloud Sync (Enabled in Settings):**
- Operations still local first (fast)
- Sync queue tracks changes
- Background sync on interval
- Multi-device merge with LWW resolution

**Sync Off → Purge:**
- User can delete server data
- Or keep frozen copy
- Personal choice

### Hybrid Share Architecture

**Data Split (Security):**
- **URL Fragment:** Encrypted vault item (never sent to server)
  ```
  https://vaultic.io/share#data=<base64-ciphertext>&nonce=<base64>
  ```
- **Server:** Only metadata (view count, expiry, max views)
  ```
  POST /api/v1/shares/metadata
  Input: { linkId }
  Output: { viewCount, maxViews, expiresAt }
  ```

**Recipient Flow:**
1. Recipient opens share link
2. Browser extracts encrypted data from URL fragment
3. Frontend calls `/shares/:linkId/metadata` (via authOptional)
4. Decrypts client-side using fragment data
5. Server logs view count (if maxViews set)

**Advantages:**
- Encrypted data never touches server
- Backward compatible (legacy shares still work)
- Independent of Cloud Sync toggle
- URL-safe encoding for special characters (url-share-codec.ts)

---

**Last updated: 2026-03-29 | User-ID-Based Profile Isolation | Backend: Node.js/Express | Database: MongoDB | IndexedDB v3**
