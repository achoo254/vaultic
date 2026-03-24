---
phase: 3
priority: critical
status: pending
estimated_days: 5
depends_on: [2]
---

# Phase 3: API Server & Database

## Overview
Build Axum REST API with SeaORM + PostgreSQL. Auth (register/login), vault CRUD, sync, secure share endpoints.

## Key Insights
- Server is zero-knowledge: only stores encrypted blobs
- Auth: client sends auth_hash (derived from master password), server stores hash(auth_hash)
- JWT for session management (short-lived access + refresh token)
- All vault data is encrypted client-side before reaching server
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
│   │   ├── vault.rs            # CRUD /vault/items, /vault/folders
│   │   ├── sync.rs             # GET /sync?since=<timestamp>
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
│   │   ├── vault_service.rs    # CRUD + sync logic
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

### vault_items
```sql
CREATE TABLE vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id),
    item_type SMALLINT NOT NULL DEFAULT 1,
    encrypted_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_vault_items_user_updated ON vault_items(user_id, updated_at);
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

## API Endpoints

### Auth
| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| POST | `/api/auth/register` | `{email, auth_hash, argon2_params, encrypted_symmetric_key}` | `{user_id}` | No |
| POST | `/api/auth/login` | `{email, auth_hash}` | `{access_token, refresh_token}` | No |
| POST | `/api/auth/refresh` | `{refresh_token}` | `{access_token}` | No |

### Vault Items
| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| GET | `/api/vault/items` | - | `[{id, folder_id, item_type, encrypted_data, updated_at}]` | JWT |
| POST | `/api/vault/items` | `{folder_id?, item_type, encrypted_data}` | `{id}` | JWT |
| PUT | `/api/vault/items/:id` | `{folder_id?, encrypted_data}` | `200` | JWT |
| DELETE | `/api/vault/items/:id` | - | `200` (soft delete) | JWT |

### Folders
| Method | Path | Body | Response | Auth |
|--------|------|------|----------|------|
| GET | `/api/vault/folders` | - | `[{id, encrypted_name, parent_id}]` | JWT |
| POST | `/api/vault/folders` | `{encrypted_name, parent_id?}` | `{id}` | JWT |
| PUT | `/api/vault/folders/:id` | `{encrypted_name}` | `200` | JWT |
| DELETE | `/api/vault/folders/:id` | - | `200` (soft delete) | JWT |

### Sync
| Method | Path | Query | Response | Auth |
|--------|------|-------|----------|------|
| GET | `/api/sync` | `?since=<ISO8601>` | `{items: [...], folders: [...], deleted_ids: [...]}` | JWT |

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

### 4. Vault CRUD handlers (3h)
- Standard CRUD with user_id scoping (user can only access own items)
- Soft delete (set deleted_at) for sync support

### 5. Sync endpoint (2h)
- Return items/folders with updated_at > since param
- Include deleted_ids for client to remove locally

### 6. Secure Share handlers (3h)
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
- [ ] GET/POST/PUT/DELETE /vault/items
- [ ] GET/POST/PUT/DELETE /vault/folders
- [ ] GET /sync?since=
- [ ] POST /share (create)
- [ ] GET /share/:id (retrieve + decrement)
- [ ] DELETE /share/:id (owner revoke)
- [ ] Error handling (AppError)
- [ ] Integration tests
- [ ] `cargo test` all pass
- [ ] Manual test with curl/httpie

## Success Criteria
- Server starts and connects to PostgreSQL
- Auth flow works: register → login → JWT → access vault
- Vault CRUD scoped to authenticated user
- Sync returns delta changes since timestamp
- Share create/retrieve respects TTL and max_views
- All encrypted_data is opaque to server (never decrypted server-side)
