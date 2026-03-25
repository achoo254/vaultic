---
phase: 6
title: "Team Org CRUD + RBAC"
status: pending
priority: P2
effort: 5h
depends_on: [5]
---

# Phase 6: Team Org CRUD + RBAC

## Context
- [Research: Team/Org](../reports/researcher-260325-team-org-management.md)
- Router pattern: `crates/vaultic-server/src/router.rs`
- Handler pattern: `crates/vaultic-server/src/handlers/auth.rs`

## Overview

4 org endpoints (create, get, update, delete) + RBAC middleware for org-scoped routes. Role checks at handler level using a helper extractor. Org creation generates org key client-side; server receives encrypted version.

## Requirements

- Create org: authenticated user becomes owner
- Get org: any member can view
- Update org: admin+ only (name, settings)
- Delete org: owner only (cascades all data)
- RBAC: role-checked per endpoint via extractor
- List orgs: return all orgs user is a member of

## Architecture

### RBAC Extractor

```rust
// New extractor: OrgAuth { user_id, org_id, role }
// Extracts org_id from URL path, looks up org_members row
// Validates user is a member with sufficient role
```

### Role Hierarchy
```
owner > admin > member
// "admin+" means admin or owner
// "member+" means any member
```

### Endpoints
```
POST   /api/orgs              — create org (AuthUser)
GET    /api/orgs              — list user's orgs (AuthUser)
GET    /api/orgs/{org_id}     — get org detail (member+)
PUT    /api/orgs/{org_id}     — update org (admin+)
DELETE /api/orgs/{org_id}     — delete org (owner only)
```

## Related Code Files

### Modify
- `crates/vaultic-server/src/router.rs` — add org routes
- `crates/vaultic-server/src/handlers/mod.rs` — export org module
- `crates/vaultic-server/src/services/mod.rs` — export org_service
- `crates/vaultic-types/src/lib.rs` — export org module

### Create
- `crates/vaultic-server/src/middleware/org_auth.rs` — OrgAuth extractor
- `crates/vaultic-server/src/handlers/org.rs`
- `crates/vaultic-server/src/services/org_service.rs`
- `crates/vaultic-types/src/org.rs`

## Implementation Steps

### 1. Add org types (`vaultic-types/src/org.rs`)

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrgRequest {
    pub encrypted_name: String,
    pub encrypted_org_key: String,  // RSA-OAEP encrypted with creator's public key
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrgResponse {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub encrypted_name: String,
    pub role: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateOrgRequest {
    pub encrypted_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrgListResponse {
    pub organizations: Vec<OrgResponse>,
}
```

### 2. Create OrgAuth extractor (`middleware/org_auth.rs`)

```rust
/// Extracts authenticated user's org membership from path param {org_id}.
/// Requires AuthUser to run first (user_id from JWT).
pub struct OrgAuth {
    pub user_id: Uuid,
    pub org_id: Uuid,
    pub role: OrgRole,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum OrgRole {
    Member = 0,
    Admin = 1,
    Owner = 2,
}

impl OrgRole {
    pub fn from_str(s: &str) -> Option<Self> { ... }
    pub fn has_at_least(&self, required: &OrgRole) -> bool {
        *self >= *required
    }
}

impl<S> FromRequestParts<S> for OrgAuth
where S: Send + Sync {
    type Rejection = AppError;

    async fn from_request_parts(parts, state) -> Result<Self, Self::Rejection> {
        // 1. Extract AuthUser (reuse existing extractor)
        let auth = AuthUser::from_request_parts(parts, state).await?;
        // 2. Extract org_id from path params
        let org_id = parts.extensions.get::<axum::extract::Path<HashMap<String,String>>>()
            // ... or extract from URI path segments
        // 3. Query org_members WHERE org_id + user_id
        // 4. Return OrgAuth { user_id, org_id, role }
        // 5. If not found → 403 Forbidden
    }
}
```

**Note:** OrgAuth needs DB access. Options:
- a) Store `DatabaseConnection` in request extensions (set by middleware layer)
- b) Make OrgAuth extraction a manual helper called in handler body
- **Recommended: (b)** — simpler, explicit, matches existing patterns

```rust
// Helper function instead of extractor:
pub async fn require_org_role(
    db: &DatabaseConnection,
    user_id: Uuid,
    org_id: Uuid,
    min_role: OrgRole,
) -> Result<OrgRole, AppError> {
    let member = org_member::Entity::find()
        .filter(org_member::Column::OrgId.eq(org_id))
        .filter(org_member::Column::UserId.eq(user_id))
        .one(db).await?
        .ok_or(AppError::Forbidden("not a member".into()))?;

    let role = OrgRole::from_str(&member.role)
        .ok_or(AppError::Internal("invalid role".into()))?;

    if !role.has_at_least(&min_role) {
        return Err(AppError::Forbidden("insufficient permissions".into()));
    }
    Ok(role)
}
```

### 3. Add `Forbidden` variant to AppError

```rust
// error.rs
#[error("forbidden: {0}")]
Forbidden(String),
// Maps to 403
```

### 4. Create org service (`services/org_service.rs`)

```rust
pub async fn create_org(db, user_id, req: CreateOrgRequest) -> Result<OrgResponse>
// 1. Insert organizations row (owner_id = user_id)
// 2. Insert org_members row (user_id, role="owner", encrypted_org_key from req)
// 3. Return OrgResponse

pub async fn list_orgs(db, user_id) -> Result<Vec<OrgResponse>>
// 1. SELECT orgs JOIN org_members WHERE user_id = ?
// 2. Return list with role per org

pub async fn get_org(db, org_id) -> Result<OrgResponse>
// 1. Find org by id
// 2. Return (caller already authorized via require_org_role)

pub async fn update_org(db, org_id, req: UpdateOrgRequest) -> Result<OrgResponse>
// 1. Update encrypted_name if provided
// 2. Set updated_at = now()

pub async fn delete_org(db, org_id) -> Result<()>
// 1. Delete organization (cascades members, invites, vault_items.org_id=NULL)
```

### 5. Create handlers (`handlers/org.rs`)

```rust
pub async fn create_org(State(state), auth: AuthUser, Json(req)) -> Result<Json<OrgResponse>>

pub async fn list_orgs(State(state), auth: AuthUser) -> Result<Json<OrgListResponse>>

pub async fn get_org(
    State(state), auth: AuthUser, Path(org_id): Path<Uuid>
) -> Result<Json<OrgResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Member).await?;
    org_service::get_org(&state.db, org_id).await.map(Json)
}

pub async fn update_org(
    State(state), auth: AuthUser, Path(org_id): Path<Uuid>, Json(req)
) -> Result<Json<OrgResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Admin).await?;
    org_service::update_org(&state.db, org_id, req).await.map(Json)
}

pub async fn delete_org(
    State(state), auth: AuthUser, Path(org_id): Path<Uuid>
) -> Result<Json<Value>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Owner).await?;
    org_service::delete_org(&state.db, org_id).await?;
    Ok(Json(json!({"deleted": true})))
}
```

### 6. Register routes

```rust
let org_routes = Router::new()
    .route("/", post(handlers::org::create_org))
    .route("/", get(handlers::org::list_orgs))
    .route("/{org_id}", get(handlers::org::get_org))
    .route("/{org_id}", put(handlers::org::update_org))
    .route("/{org_id}", delete(handlers::org::delete_org));

// In create_router:
.nest("/api/orgs", org_routes)
```

## Todo

- [ ] Create `vaultic-types/src/org.rs` with request/response types
- [ ] Add `Forbidden` variant to AppError
- [ ] Create `middleware/org_auth.rs` with `require_org_role` helper
- [ ] Create `services/org_service.rs`
- [ ] Create `handlers/org.rs`
- [ ] Register org routes in router.rs
- [ ] Export new modules in mod.rs files
- [ ] `cargo build -p vaultic-server` passes
- [ ] Test: create org → list → get → update → delete

## Success Criteria

- Create org inserts org + owner membership in single transaction
- List orgs returns only orgs user belongs to
- Get/update/delete respect role requirements (403 for insufficient role)
- Delete cascades correctly
- Non-members get 403 on all org-scoped routes

## Security Considerations

- Role check at handler level (explicit, auditable)
- Owner role only assigned at creation — cannot be set via update
- `encrypted_name` + `encrypted_org_key` are ciphertext — server sees nothing
- Org delete is destructive — consider soft-delete in future
- Transaction for create (org + member) prevents orphan states
