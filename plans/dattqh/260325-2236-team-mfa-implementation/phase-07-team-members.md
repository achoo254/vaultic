---
phase: 7
title: "Team Members & Invites"
status: pending
priority: P2
effort: 5h
depends_on: [6]
---

# Phase 7: Team Members & Invites

## Context
- [Research: Team/Org](../reports/researcher-260325-team-org-management.md)
- Org entities from Phase 5, RBAC helper from Phase 6

## Overview

4 member endpoints: invite (generate code), accept invite, list members, update role, remove member. Invite flow uses shareable codes (no SMTP). Accepting invite requires the invitee's client to provide their RSA-OAEP wrapped org key.

## Requirements

- Invite: admin+ generates invite code with assigned role, 7-day expiry
- Accept: authenticated user redeems code, provides encrypted_org_key
- List: any member can list all org members + roles
- Update role: admin+ can change member role (cannot promote above own role)
- Remove: admin+ can remove members (cannot remove owner)
- Owner transfer: separate explicit endpoint (owner only)

## Architecture

### Invite Flow
```
Admin → POST /api/orgs/{org_id}/invites { role: "member" }
Server → generate 32-char code, store in org_invites (expires 7d)
       → return { invite_code, invite_url, expires_at }

Invitee → POST /api/orgs/invites/accept { invite_code, encrypted_org_key }
  (AuthUser required — invitee must be registered)
Server → validate code (not expired, not used)
       → create org_members row (role from invite)
       → mark invite as accepted
       → return { org_id, role }
```

### Org Key Exchange (Client-Side)
```
1. Inviter decrypts org key with own private key
2. Inviter encrypts org key with invitee's RSA public key
3. Inviter sends encrypted_org_key to server
4. Server stores in org_members.encrypted_org_key

MVP simplification: invitee provides own encrypted_org_key at accept time.
This means inviter must share the org key out-of-band OR:
  → Server holds a "pending" membership until inviter wraps the key
  → OR: Use a key-exchange endpoint after accept
```

**Decision for MVP:** Two-step invite:
1. Invite creates code
2. Accept creates pending membership (encrypted_org_key = empty)
3. Inviter (admin+) calls `POST /api/orgs/{org_id}/members/{user_id}/key` with wrapped key
4. Membership becomes active once key is set

### Endpoints
```
POST   /api/orgs/{org_id}/invites              — create invite (admin+)
POST   /api/orgs/invites/accept                — accept invite (AuthUser)
GET    /api/orgs/{org_id}/members              — list members (member+)
PUT    /api/orgs/{org_id}/members/{user_id}    — update role (admin+)
DELETE /api/orgs/{org_id}/members/{user_id}    — remove member (admin+)
POST   /api/orgs/{org_id}/members/{user_id}/key — set encrypted org key (admin+)
```

## Related Code Files

### Modify
- `crates/vaultic-server/src/router.rs` — add member + invite routes
- `crates/vaultic-server/src/handlers/org.rs` — add member handlers
- `crates/vaultic-types/src/org.rs` — add member/invite types

### Create
- `crates/vaultic-server/src/services/member_service.rs`
- `crates/vaultic-server/src/services/invite_service.rs`

## Implementation Steps

### 1. Add types (`vaultic-types/src/org.rs`)

```rust
pub struct CreateInviteRequest {
    pub role: String,  // "admin" or "member"
}
pub struct InviteResponse {
    pub invite_code: String,
    pub invite_url: String,    // "{origin}/invite/{code}"
    pub role: String,
    pub expires_at: String,
}
pub struct AcceptInviteRequest {
    pub invite_code: String,
}
pub struct AcceptInviteResponse {
    pub org_id: Uuid,
    pub role: String,
    pub pending_key: bool,  // true = needs key from admin
}
pub struct MemberResponse {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
    pub has_key: bool,       // encrypted_org_key is set
    pub accepted_at: Option<String>,
}
pub struct MemberListResponse {
    pub members: Vec<MemberResponse>,
}
pub struct UpdateRoleRequest {
    pub role: String,
}
pub struct SetMemberKeyRequest {
    pub encrypted_org_key: String,
}
```

### 2. Create invite service (`services/invite_service.rs`)

```rust
const INVITE_CODE_LEN: usize = 32;
const INVITE_TTL_DAYS: i64 = 7;

pub async fn create_invite(db, org_id, created_by, role) -> Result<InviteResponse>
// 1. Validate role is "admin" or "member" (not "owner")
// 2. Generate random 32-char alphanumeric code
// 3. Insert org_invites row with expires_at = now + 7 days
// 4. Return code + constructed URL

pub async fn accept_invite(db, user_id, invite_code) -> Result<AcceptInviteResponse>
// 1. Find invite by code
// 2. Validate: not expired, not already accepted
// 3. Check user not already a member of this org
// 4. Insert org_members (encrypted_org_key = "" — pending)
// 5. Update invite: accepted_by_id, accepted_at
// 6. Return org_id + role + pending_key=true

fn generate_invite_code() -> String
// Random 32 chars from alphanumeric charset
```

### 3. Create member service (`services/member_service.rs`)

```rust
pub async fn list_members(db, org_id) -> Result<Vec<MemberResponse>>
// 1. SELECT org_members JOIN users WHERE org_id
// 2. Return with email, role, has_key status

pub async fn update_role(db, actor_role, org_id, target_user_id, new_role) -> Result<()>
// 1. Cannot change owner role
// 2. Cannot promote above actor's own role
// 3. Cannot demote someone with equal or higher role
// 4. Update org_members.role

pub async fn remove_member(db, actor_role, org_id, target_user_id) -> Result<()>
// 1. Cannot remove owner
// 2. Cannot remove someone with equal or higher role (unless self-leave)
// 3. Delete org_members row
// 4. Future: trigger key rotation

pub async fn set_member_key(db, org_id, target_user_id, encrypted_org_key) -> Result<()>
// 1. Update org_members.encrypted_org_key
// 2. Key is RSA-OAEP wrapped — server stores as-is

pub async fn leave_org(db, user_id, org_id) -> Result<()>
// 1. If owner: must transfer ownership first
// 2. Delete own org_members row
```

### 4. Add handlers (`handlers/org.rs`)

```rust
pub async fn create_invite(State(state), auth: AuthUser, Path(org_id), Json(req))
    -> Result<Json<InviteResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Admin).await?;
    invite_service::create_invite(&state.db, org_id, auth.user_id, &req.role).await.map(Json)
}

pub async fn accept_invite(State(state), auth: AuthUser, Json(req))
    -> Result<Json<AcceptInviteResponse>> {
    invite_service::accept_invite(&state.db, auth.user_id, &req.invite_code).await.map(Json)
}

pub async fn list_members(State(state), auth: AuthUser, Path(org_id))
    -> Result<Json<MemberListResponse>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Member).await?;
    // ...
}

pub async fn update_role(State(state), auth: AuthUser, Path((org_id, user_id)), Json(req))
    -> Result<Json<Value>> {
    let actor_role = require_org_role(&state.db, auth.user_id, org_id, OrgRole::Admin).await?;
    member_service::update_role(&state.db, actor_role, org_id, user_id, &req.role).await?;
    // ...
}

pub async fn remove_member(State(state), auth: AuthUser, Path((org_id, user_id)))
    -> Result<Json<Value>> {
    let actor_role = require_org_role(&state.db, auth.user_id, org_id, OrgRole::Admin).await?;
    member_service::remove_member(&state.db, actor_role, org_id, user_id).await?;
    // ...
}

pub async fn set_member_key(State(state), auth: AuthUser, Path((org_id, user_id)), Json(req))
    -> Result<Json<Value>> {
    require_org_role(&state.db, auth.user_id, org_id, OrgRole::Admin).await?;
    member_service::set_member_key(&state.db, org_id, user_id, &req.encrypted_org_key).await?;
    // ...
}
```

### 5. Register routes

```rust
let member_routes = Router::new()
    .route("/invites", post(handlers::org::create_invite))
    .route("/members", get(handlers::org::list_members))
    .route("/members/{user_id}", put(handlers::org::update_role))
    .route("/members/{user_id}", delete(handlers::org::remove_member))
    .route("/members/{user_id}/key", post(handlers::org::set_member_key));

// Nest under org routes:
// /api/orgs/{org_id}/invites, /api/orgs/{org_id}/members/...

let invite_accept_route = Router::new()
    .route("/invites/accept", post(handlers::org::accept_invite));
// /api/orgs/invites/accept (no org_id in path — code identifies the org)
```

## Todo

- [ ] Add member/invite types to `vaultic-types/src/org.rs`
- [ ] Create `services/invite_service.rs`
- [ ] Create `services/member_service.rs`
- [ ] Add handlers to `handlers/org.rs`
- [ ] Register member + invite routes
- [ ] `cargo build -p vaultic-server` passes
- [ ] Test: invite → accept → set key → list → update role → remove

## Success Criteria

- Invite generates unique 32-char code with 7-day TTL
- Accept creates pending membership (no org key yet)
- Set key completes membership activation
- Role changes enforce hierarchy (no self-promotion)
- Remove prevents owner removal
- Expired/used invites rejected

## Security Considerations

- Invite codes: 32-char random, cryptographically secure RNG
- Single-use: accepted_by_id set, code cannot be reused
- Expire after 7 days
- Role hierarchy enforced server-side — client cannot bypass
- encrypted_org_key is opaque to server (RSA-OAEP ciphertext)
- Owner role protected: cannot be removed, role cannot be changed
- Self-leave allowed (except owner — must transfer first)
