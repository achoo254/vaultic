# Code Review: Phase 3 — Server, Migration, Types

**Score: 7/10**

## Scope
- **Crates**: `vaultic-server` (20 files), `vaultic-migration` (5 files), `vaultic-types` (5 files)
- **LOC**: ~950 Rust lines
- **Focus**: Security, correctness, idiomatic Rust, API design

## Overall Assessment

Solid foundation. Clean module separation, proper zero-knowledge design (server never sees plaintext), good use of SeaORM + Axum patterns. Several security and correctness issues need attention before production.

---

## Critical Issues

### C1. SHA-256 for auth_hash storage — no salting, no slow hash
**File**: `services/auth_service.rs:33`
```rust
let server_hash = hex::encode(Sha256::digest(auth_hash.as_bytes()));
```
The server hashes the client's `auth_hash` with plain SHA-256. If the DB leaks, an attacker can rainbow-table these hashes since SHA-256 is fast and there is no per-user salt. Even though `auth_hash` is already Argon2id-derived on the client, the server-side hash should still be salted to prevent cross-user correlation and precomputed attacks.

**Fix**: Use `argon2` or `bcrypt` server-side (with salt) instead of raw SHA-256. If performance is a concern (auth_hash is already slow-derived), at minimum use HMAC-SHA256 with a server-side secret key:
```rust
use hmac::{Hmac, Mac};
type HmacSha256 = Hmac<Sha256>;
let mut mac = HmacSha256::new_from_slice(server_secret.as_bytes()).unwrap();
mac.update(auth_hash.as_bytes());
let server_hash = hex::encode(mac.finalize().into_bytes());
```

### C2. Share view count race condition (TOCTOU)
**File**: `services/share_service.rs:52-80`

The retrieve function reads `current_views`, checks against `max_views`, then increments in a separate UPDATE. Two concurrent requests can both pass the check and exceed `max_views`.

**Fix**: Use an atomic SQL UPDATE with a WHERE clause:
```rust
// Single atomic query: UPDATE secure_shares SET current_views = current_views + 1
// WHERE id = ? AND (max_views IS NULL OR current_views < max_views)
// RETURNING encrypted_data
let result = secure_share::Entity::update_many()
    .col_expr(secure_share::Column::CurrentViews, Expr::col(secure_share::Column::CurrentViews).add(1))
    .filter(secure_share::Column::Id.eq(share_id))
    .filter(
        Condition::any()
            .add(secure_share::Column::MaxViews.is_null())
            .add(Expr::col(secure_share::Column::CurrentViews).lt(Expr::col(secure_share::Column::MaxViews)))
    )
    .exec(db).await?;
```
If `rows_affected == 0`, the share is either expired, exhausted, or missing.

### C3. CORS allows Any origin in all environments
**File**: `main.rs:59-62`
```rust
let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any);
```
This should be restricted in production. With `allow_origin(Any)`, any website can make authenticated requests to the API if credentials mode is used.

**Fix**: Read allowed origins from config. In dev, allow any. In prod, restrict to extension origin and web domain.

---

## High Priority

### H1. No user_id validation on sync push — any user can overwrite another user's items
**File**: `services/sync_service.rs:26,62`

When pushing, the code does `folder::Entity::find_by_id(f.id)` and `vault_item::Entity::find_by_id(item.id)`. If an existing record is found, it updates it **without checking that `existing.user_id == user_id`**. A malicious user could push items with IDs belonging to another user and overwrite their data.

**Fix**: Add user_id check after finding existing:
```rust
if existing.user_id != user_id {
    return Err(AppError::Unauthorized("item does not belong to user".into()));
}
```

### H2. No JWT algorithm restriction
**File**: `middleware/auth.rs:50-54`

`Validation::default()` uses HS256 but doesn't explicitly restrict algorithms. If the JWT library defaults change, this could open algorithm confusion attacks.

**Fix**: Explicitly set allowed algorithms:
```rust
let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
```

### H3. Refresh tokens are not revocable
**File**: `services/auth_service.rs:79-102`

Refresh tokens are stateless JWTs. If compromised, they cannot be revoked until expiry (7 days default). There is no server-side token store or blacklist.

**Fix (deferred acceptable for MVP)**: Document this as a known limitation. For Phase 2, implement a `refresh_tokens` table with jti-based revocation. At minimum, add a `jti` claim now so revocation can be added later without breaking tokens.

### H4. No email validation
**File**: `handlers/auth.rs:18`

Only checks `req.email.is_empty()`. No format validation. Malicious input like very long strings or special characters could cause issues.

**Fix**: Add basic email format validation (contains `@`, reasonable length).

### H5. No rate limiting on auth endpoints
Login and register have no rate limiting. Brute-force attacks on login are trivially easy.

**Fix**: Add `tower_governor` or similar rate-limiting middleware on `/api/auth/*` routes.

### H6. Sync push is not transactional
**File**: `services/sync_service.rs:13-112`

Each folder/item is inserted/updated individually. If the process fails midway, partial data is committed. This can leave sync state inconsistent.

**Fix**: Wrap the entire push in a database transaction:
```rust
let txn = db.begin().await?;
// ... all operations on &txn ...
txn.commit().await?;
```

---

## Medium Priority

### M1. No pagination on sync pull
**File**: `services/sync_service.rs:115-183`

Pull returns ALL items since `since` timestamp with no limit. A user with thousands of items could cause large responses and memory pressure.

**Fix**: Add `limit` and `offset` query params, or cursor-based pagination.

### M2. Folder pull doesn't exclude device_id
**File**: `services/sync_service.rs:135-142`

Items filter out `device_id != requesting_device`, but folders don't. Folders don't have a `device_id` column, so the client may receive back folders it just pushed.

**Fix**: Add `device_id` to folders table, or document this as expected behavior (client handles idempotent folder updates).

### M3. `encrypted_data` stored as TEXT, not validated
No size limit on `encrypted_data` field. A malicious client could push arbitrarily large payloads.

**Fix**: Add a max length check in handlers (e.g., 1MB limit) before passing to service layer.

### M4. Missing index on folders for sync pull
The `vault_items` table has `idx_vault_items_user_updated`, but `folders` table has no equivalent index for `(user_id, updated_at)` queries.

**Fix**: Add index in migration:
```rust
Index::create().name("idx_folders_user_updated").table(Folders::Table).col(Folders::UserId).col(Folders::UpdatedAt)
```

### M5. Share ID collision possible
**File**: `services/share_service.rs:15-20`

`generate_share_id()` creates a random 12-char ID without checking for collisions. With 62^12 space this is unlikely but not impossible. DB insert would fail with a cryptic error.

**Fix**: Either retry on unique constraint violation, or use UUID.

### M6. Inconsistent error response format
`refresh` handler returns `serde_json::Value` while others return typed responses. `purge` also returns ad-hoc JSON.

**Fix**: Create response types in `vaultic-types` for all endpoints.

### M7. `config` passed both via `State` and `Extension`
**File**: `main.rs:64-66`

`config` is in `AppState` AND in `axum::Extension`. The auth middleware reads from `Extension`, but handlers read from `State`. This duplication is fragile.

**Fix**: Use only `State<AppState>` everywhere. Implement `FromRequestParts` for `AuthUser` using the `AppState` directly.

---

## Low Priority

### L1. `User` type in `vaultic-types` exposes `auth_hash`
**File**: `vaultic-types/src/user.rs:8-16`

The shared `User` struct includes `auth_hash`. This type should never be serialized to clients. Consider splitting into `User` (no secrets) and `UserRecord` (internal).

### L2. `item_type` mismatch: enum in types, i16 in sync
`vault.rs` uses `ItemType` enum, but `sync.rs` uses `Option<i16>`. This makes the types inconsistent. Should map between them.

### L3. Missing `#[serde(deny_unknown_fields)]` on request types
Extra fields in requests are silently ignored. Not critical but reduces API strictness.

### L4. `DateTime::<Utc>::MIN_UTC` as fallback for missing timestamps
**File**: `services/sync_service.rs:30,66`

Using minimum date as fallback means any client timestamp wins over a missing server timestamp. This is likely correct but should be documented.

---

## Positive Observations

1. **Zero-knowledge design**: Server correctly never decrypts data. All vault content is encrypted blobs.
2. **Clean module structure**: handler/service/entity separation is well organized
3. **Proper error type**: `AppError` with `thiserror` + `IntoResponse` is idiomatic Axum
4. **Auth hash double-hashing**: Server stores hash(auth_hash) not raw auth_hash — good defense-in-depth concept (needs salt fix per C1)
5. **Share access control**: Delete requires owner check, retrieve is correctly public
6. **Good migration design**: Foreign keys with CASCADE on user deletion, appropriate indexes on vault_items
7. **Token type enforcement**: JWT middleware correctly rejects refresh tokens used as access tokens
8. **Soft deletes**: Using `deleted_at` for sync tombstones is correct for delta sync

---

## Recommended Actions (Priority Order)

1. **[C1]** Replace SHA-256 with HMAC-SHA256 (server secret) or bcrypt for auth_hash storage
2. **[H1]** Add user_id ownership check on sync push updates — **data isolation bug**
3. **[C2]** Fix share view count race condition with atomic UPDATE
4. **[H6]** Wrap sync push in database transaction
5. **[C3]** Restrict CORS to allowed origins in production
6. **[H2]** Explicitly set JWT algorithm validation
7. **[H5]** Add rate limiting on auth endpoints
8. **[H4]** Add email validation
9. **[M3]** Add payload size limits
10. **[M4]** Add missing folder index
11. **[M7]** Remove config duplication (Extension vs State)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Safety | Good — SeaORM + strong Rust typing |
| Test Coverage | 0% — no tests found |
| Security Issues | 3 critical, 4 high |
| Code Smells | 3 medium |

---

## Unresolved Questions

1. Is the lack of refresh token revocation acceptable for MVP? If yes, should `jti` claim be added now for future-proofing?
2. Should expired/exhausted shares be auto-cleaned by a background job, or left for manual purge?
3. Is `device_id` on folders intentionally omitted, or an oversight?
4. Should the purge endpoint also delete secure_shares created by the user?
