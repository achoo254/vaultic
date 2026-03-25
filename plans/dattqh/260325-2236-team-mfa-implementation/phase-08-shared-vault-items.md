---
phase: 8
title: "Shared Vault Items"
status: pending
priority: P2
effort: 5h
depends_on: [7]
---

# Phase 8: Shared Vault Items

## Context
- [Research: Team/Org](../reports/researcher-260325-team-org-management.md)
- vault_items entity: `crates/vaultic-server/src/entities/vault_item.rs`
- vault_items now has `org_id` FK (added Phase 5)

## Overview

Team vault items encrypted with org key (not user's personal key). CRUD through org-scoped endpoints. Items belong to org, visible to all members with decrypted org key. Reuses existing vault_items table with org_id set.

## Requirements

- Create team item: member+ creates vault item with org_id set
- List team items: member+ sees all items for their org
- Update team item: member+ can update items they can decrypt
- Delete team item: admin+ can delete any team item
- Items encrypted client-side with org key (AES-256-GCM)
- Personal items (org_id=NULL) unaffected by team endpoints
- Sync integration: team items included in sync push/pull when sync enabled

## Architecture

### Encryption Model
```
Personal item: encrypted with user's symmetric key
Team item:     encrypted with org symmetric key

Client has org key → decrypt org_members.encrypted_org_key with user's RSA private key
                   → use decrypted org key to encrypt/decrypt team items
```

### Data Flow
```
Create team item:
  Client → encrypt item data with org key
         → POST /api/orgs/{org_id}/items { encrypted_data, type, ... }
  Server → insert vault_items with org_id set

List team items:
  Client → GET /api/orgs/{org_id}/items
  Server → SELECT vault_items WHERE org_id = ?
         → return encrypted items
  Client → decrypt each with org key
```

### Endpoints
```
POST   /api/orgs/{org_id}/items          — create team item (member+)
GET    /api/orgs/{org_id}/items          — list team items (member+)
GET    /api/orgs/{org_id}/items/{id}     — get single item (member+)
PUT    /api/orgs/{org_id}/items/{id}     — update item (member+)
DELETE /api/orgs/{org_id}/items/{id}     — delete item (admin+)
```

## Related Code Files

### Modify
- `crates/vaultic-server/src/router.rs` — add team item routes
- `crates/vaultic-server/src/handlers/org.rs` — add team item handlers (or new file)
- `crates/vaultic-types/src/org.rs` — add team item types
- `crates/vaultic-server/src/services/sync_service.rs` — include team items in sync

### Create
- `crates/vaultic-server/src/services/team_vault_service.rs`
- `crates/vaultic-server/src/handlers/team_vault.rs` (if org.rs gets too large)

## Implementation Steps

### 1. Add types (`vaultic-types/src/org.rs`)

```rust
pub struct CreateTeamItemRequest {
    pub encrypted_data: String,  // AES-256-GCM with org key
    pub item_type: String,       // "login", "note", "card", "identity"
    pub encrypted_name: Option<String>,
    pub folder_id: Option<Uuid>,
}

pub struct TeamItemResponse {
    pub id: Uuid,
    pub org_id: Uuid,
    pub encrypted_data: String,
    pub item_type: String,
    pub encrypted_name: Option<String>,
    pub created_by: Uuid,
    pub created_at: String,
    pub updated_at: String,
}

pub struct TeamItemListResponse {
    pub items: Vec<TeamItemResponse>,
}

pub struct UpdateTeamItemRequest {
    pub encrypted_data: Option<String>,
    pub encrypted_name: Option<String>,
    pub folder_id: Option<Uuid>,
}
```

### 2. Create team vault service (`services/team_vault_service.rs`)

```rust
pub async fn create_item(db, org_id, user_id, req) -> Result<TeamItemResponse>
// 1. Insert vault_items with org_id set, user_id as creator
// 2. Return created item

pub async fn list_items(db, org_id) -> Result<Vec<TeamItemResponse>>
// 1. SELECT vault_items WHERE org_id = ? ORDER BY updated_at DESC
// 2. Return all (member already authorized at handler level)

pub async fn get_item(db, org_id, item_id) -> Result<TeamItemResponse>
// 1. Find item WHERE id = ? AND org_id = ?
// 2. 404 if not found or wrong org

pub async fn update_item(db, org_id, item_id, req) -> Result<TeamItemResponse>
// 1. Find item, verify org_id matches
// 2. Update encrypted_data, encrypted_name, folder_id
// 3. Set updated_at = now()

pub async fn delete_item(db, org_id, item_id) -> Result<()>
// 1. Delete vault_items WHERE id = ? AND org_id = ?
```

### 3. Create handlers (`handlers/team_vault.rs`)

```rust
pub async fn create_item(
    State(state), auth: AuthUser, Path(org_id), Json(req)
) -> Result<Json<TeamItemResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Member).await?;
    team_vault_service::create_item(&state.db, org_id, auth.user_id, req).await.map(Json)
}

pub async fn list_items(
    State(state), auth: AuthUser, Path(org_id)
) -> Result<Json<TeamItemListResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Member).await?;
    // ...
}

pub async fn get_item(
    State(state), auth: AuthUser, Path((org_id, item_id))
) -> Result<Json<TeamItemResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Member).await?;
    // ...
}

pub async fn update_item(
    State(state), auth: AuthUser, Path((org_id, item_id)), Json(req)
) -> Result<Json<TeamItemResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Member).await?;
    // ...
}

pub async fn delete_item(
    State(state), auth: AuthUser, Path((org_id, item_id))
) -> Result<Json<Value>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Admin).await?;
    team_vault_service::delete_item(&state.db, org_id, item_id).await?;
    Ok(Json(json!({"deleted": true})))
}
```

### 4. Register routes

```rust
let team_item_routes = Router::new()
    .route("/items", post(handlers::team_vault::create_item))
    .route("/items", get(handlers::team_vault::list_items))
    .route("/items/{item_id}", get(handlers::team_vault::get_item))
    .route("/items/{item_id}", put(handlers::team_vault::update_item))
    .route("/items/{item_id}", delete(handlers::team_vault::delete_item));

// Nest under /api/orgs/{org_id}
```

### 5. Sync integration (if sync enabled)

Modify `sync_service.rs` push/pull to include team items:
- Pull: include vault_items WHERE org_id IN (user's org memberships)
- Push: accept items with org_id, validate membership before storing

This is optional for MVP — can be deferred to a follow-up phase.

## Todo

- [ ] Add team item types to `vaultic-types/src/org.rs`
- [ ] Create `services/team_vault_service.rs`
- [ ] Create `handlers/team_vault.rs`
- [ ] Register team item routes under /api/orgs/{org_id}
- [ ] Export new modules
- [ ] `cargo build -p vaultic-server` passes
- [ ] Test: create team item → list → get → update → delete
- [ ] (Stretch) Sync integration for team items

## Success Criteria

- Team items stored with org_id set, personal items unaffected
- Only org members can CRUD team items
- Delete requires admin+ role
- Items encrypted with org key (server stores only ciphertext)
- Existing vault_items endpoints still work for personal items

## Security Considerations

- Server never decrypts team items — encrypted with org key client-side
- Membership check on every request (require_org_role)
- Item org_id validated against path param — cannot access cross-org items
- Delete is admin+ (prevents members from deleting shared credentials)
- No mixing: personal items cannot be "moved" to org via API (future feature)

## Unresolved Questions

1. **Sync for team items**: should team items sync through existing sync engine, or separate team-sync endpoint?
2. **Item ownership tracking**: should we track who created/last-modified team items? (currently creator stored as user_id)
3. **Granular permissions**: should members have per-item or per-folder restrictions? (deferred — all members see all org items for MVP)
