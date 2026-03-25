---
phase: 3
priority: critical
status: pending
estimated_days: 4
depends_on: [2]
---

# Phase 3: API Server & Database

## Overview
Build Axum REST API with SeaORM + PostgreSQL. **Offline-first architecture**: server only handles auth, sync relay, and secure share. No vault CRUD endpoints — all CRUD happens client-side in IndexedDB.

## Key Insights
- **Server role: auth + sync relay + share broker ONLY**
- Server is zero-knowledge: only stores encrypted blobs
- Auth: client sends auth_hash (derived from master password), server stores hash(auth_hash)
- JWT for session management (short-lived access + refresh token)
- Vault CRUD is 100% client-side (IndexedDB) — server only receives sync pushes
- Sync: client pushes local changes, pulls remote changes (delta sync, LWW)
- Use `rustls` for TLS (no openssl dependency)

## Architecture

```
vaultic-server/
├── src/
│   ├── main.rs                 # Entry point, Axum router setup
│   ├── config.rs               # Env config (DATABASE_URL, JWT_SECRET, etc.)
│   ├── router.rs               # Route definitions
│   ├── middleware/
│   │   ├── mod.rs
│   │   └── auth.rs             # JWT extraction + validation
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── auth.rs             # POST /auth/register, /auth/login, /auth/refresh
│   │   ├── sync.rs             # POST /sync/push, GET /sync/pull?since=<timestamp>
│   │   └── share.rs            # POST /share, GET /share/:id
│   ├── models/                 # SeaORM entities
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   ├── vault_item.rs
│   │   ├── folder.rs
│   │   └── secure_share.rs
│   ├── services/
│   │   ├── mod.rs
│   │   ├── auth_service.rs     # Register, login, token logic
│   │   ├── sync_service.rs     # Sync relay: accept push, serve pull
│   │   └── share_service.rs    # Secure share logic
│   └── error.rs                # AppError → Axum response
├── migration/                  # SeaORM migrations
│   └── src/
│       ├── lib.rs
│       ├── m20260324_000001_create_users.rs
│       ├── m20260324_000002_create_folders.rs
│       ├── m20260324_000003_create_vault_items.rs
│       └── m20260324_000004_create_secure_shares.rs
└── Cargo.toml
```

## Database Schema

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    auth_hash TEXT NOT NULL,
    encrypted_symmetric_key TEXT,
    argon2_params JSONB NOT NULL DEFAULT '{"m":65536,"t":3,"p":4}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### folders
```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

### vault_items (server-side sync copy)
```sql
CREATE TABLE vault_items (
    id UUID PRIMARY KEY,              -- Client-generated UUID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id),
    item_type SMALLINT NOT NULL DEFAULT 1,
    encrypted_data TEXT NOT NULL,
    device_id VARCHAR(36) NOT NULL,    -- Source device for sync dedup
    version INT NOT NULL DEFAULT 1,    -- For LWW conflict detection
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_vault_items_user_updated ON vault_items(user_id, updated_at);
CREATE INDEX idx_vault_items_device ON vault_items(user_id, device_id);
```

### secure_shares
```sql
CREATE TABLE secure_shares (
    id VARCHAR(12) PRIMARY KEY,
    vault_item_id UUID REFERENCES vault_items(id),
    user_id UUID NOT NULL REFERENCES users(id),
    encrypted_data TEXT NOT NULL,
    max_views INT,                    -- NULL = unlimited views
    current_views INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,            -- NULL = never expires
    created_at TIMESTAMPTZ DEFAULT now(),
    accessed_at TIMESTAMPTZ
);
-- Cleanup index: only for shares that have limits set
CREATE INDEX idx_shares_cleanup ON secure_shares(expires_at)
    WHERE expires_at IS NOT NULL OR max_views IS NOT NULL;
```

## API Endpoints (Offline-First — User-Controlled Sync)

### Auth
| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| POST | `/api/auth/register` | `{email, auth_hash, argon2_params, encrypted_symmetric_key}` | `{user_id}` | No |
| POST | `/api/auth/login` | `{email, auth_hash}` | `{access_token, refresh_token}` | No |
| POST | `/api/auth/refresh` | `{refresh_token}` | `{access_token}` | No |

### Sync (opt-in — only works when user enables Cloud Sync in Settings)
| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| POST | `/api/sync/push` | `{items: [...], folders: [...], device_id}` | `{accepted: [...], conflicts: [...]}` | JWT |
| GET | `/api/sync/pull` | `?since=<ISO8601>&device_id=<id>` | `{items: [...], folders: [...], deleted_ids: [...], server_time}` | JWT |
| DELETE | `/api/sync/purge` | - | `{deleted_count}` | JWT |

**Sync is user-controlled:**
- Default: OFF. Server has NO vault data.
- User enables Cloud Sync → first push = full vault upload (encrypted blobs).
- After that: delta sync (push/pull) when user has sync ON.
- User disables Cloud Sync → option to delete server data (`DELETE /api/sync/purge`) or keep frozen.
- Conflict resolution: Last-Write-Wins (LWW) by `updated_at` timestamp.

### Secure Share
| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| POST | `/api/share` | `{encrypted_data, max_views?, ttl_hours?, vault_item_id?}` | `{share_id}` | JWT |
| GET | `/api/share/:id` | - | `{encrypted_data}` + decrement views | No |
| DELETE | `/api/share/:id` | - | `200` | JWT (owner only) |

## Implementation Steps

### 1. SeaORM setup + migrations (3h)
- `sea-orm-cli` generate migration files
- Run migrations against Docker PostgreSQL
- Generate entities from schema

### 2. Config + main.rs (1h)
- Load from env: DATABASE_URL, JWT_SECRET, SERVER_PORT
- Initialize SeaORM connection pool
- Setup Axum router with CORS (tower-http)

### 3. Auth handlers + service (4h)
- Register: validate email, hash auth_hash with SHA256, store user
- Login: verify auth_hash, issue JWT (access 15min + refresh 7d)
- Refresh: validate refresh token, issue new access token
- JWT middleware: extract user_id from Bearer token

### 4. Sync relay handlers (4h)
**POST /api/sync/push**: Client pushes local changes
- Accept batch of encrypted items + folders from client
- Upsert into server DB (server stores ciphertext as-is, no validation of contents)
- Track `device_id` to avoid echoing changes back to sender
- Return accepted IDs + any conflicts (same item updated by another device)
- Conflict resolution: LWW by `updated_at` — latest timestamp wins

**GET /api/sync/pull**: Client pulls remote changes
- Return items/folders with `updated_at > since` AND `device_id != requester`
- Include `deleted_ids` for client to remove locally
- Return `server_time` for next sync cursor

### 5. Secure Share handlers (3h)
- Create: generate 12-char URL-safe ID, store encrypted_data + TTL
- Retrieve: check views < max_views AND now < expires_at, increment views
- Auto-cleanup: scheduled task or lazy deletion on access
- Delete: owner only (verify JWT user_id)

### 7. Error handling (1h)
- AppError enum → proper HTTP status codes
- Consistent JSON error response format

### 8. Integration tests (3h)
- Test auth flow: register → login → use JWT → refresh
- Test vault CRUD: create → read → update → delete → verify soft delete
- Test sync: create items → sync since timestamp → verify delta
- Test share: create → retrieve → verify view count → verify expiry

## Todo List
- [ ] SeaORM migrations (users, folders, vault_items, secure_shares)
- [ ] Generate SeaORM entities
- [ ] Config from env vars
- [ ] Axum router + CORS middleware
- [ ] JWT auth middleware
- [ ] POST /auth/register
- [ ] POST /auth/login
- [ ] POST /auth/refresh
- [ ] POST /sync/push (accept batch of encrypted items)
- [ ] GET /sync/pull?since= (return delta + deleted_ids)
- [ ] LWW conflict resolution logic
- [ ] POST /share (create)
- [ ] GET /share/:id (retrieve + decrement)
- [ ] DELETE /share/:id (owner revoke)
- [ ] Error handling (AppError)
- [ ] Integration tests
- [ ] `cargo test` all pass
- [ ] Manual test with curl/httpie

## Success Criteria
- Server starts and connects to PostgreSQL
- Auth flow works: register → login → JWT
- **No vault CRUD endpoints** — server only accepts sync push/pull
- Sync push stores encrypted blobs as-is
- Sync pull returns delta changes since timestamp, excludes sender's device
- LWW conflict resolution works correctly
- Share create/retrieve respects TTL and max_views
- All encrypted_data is opaque to server (never decrypted server-side)
