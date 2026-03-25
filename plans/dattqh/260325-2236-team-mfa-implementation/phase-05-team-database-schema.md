---
phase: 5
title: "Team Database Schema"
status: pending
priority: P2
effort: 3h
depends_on: [1, 2, 3, 4]
---

# Phase 5: Team Database Schema

## Context
- [Research: Team/Org Management](../reports/researcher-260325-team-org-management.md)
- Migration pattern: `crates/vaultic-migration/src/m20260324_000001_create_users.rs`

## Overview

3 new tables: `organizations`, `org_members`, `org_invites`. Plus alter `vault_items` to add optional `org_id` FK for team items. Collections deferred to stretch goal.

## Requirements

- `organizations`: org metadata, encrypted name, owner reference
- `org_members`: M2M users-orgs with role + encrypted org key per member
- `org_invites`: shareable invite codes with expiry (no SMTP)
- `vault_items.org_id`: nullable FK to mark items as team-owned
- All cascades on org delete
- Roles: owner, admin, member (3 roles for MVP; viewer deferred)

## Architecture

```
organizations
  +--< org_members (M2M with users, includes role + encrypted_org_key)
  +--< org_invites (shareable codes)
  +--< vault_items (via org_id FK, nullable)

users
  +--< org_members
```

### Role Enum
```sql
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
```

## Related Code Files

### Modify
- `crates/vaultic-migration/src/lib.rs` — register new migrations
- `crates/vaultic-server/src/entities/mod.rs` — export new entities
- `crates/vaultic-server/src/entities/user.rs` — add OrgMembers relation
- `crates/vaultic-server/src/entities/vault_item.rs` — add org_id column + relation

### Create
- `crates/vaultic-migration/src/m20260325_000009_create_organizations.rs`
- `crates/vaultic-migration/src/m20260325_000010_create_org_members.rs`
- `crates/vaultic-migration/src/m20260325_000011_create_org_invites.rs`
- `crates/vaultic-migration/src/m20260325_000012_add_org_id_to_vault_items.rs`
- `crates/vaultic-server/src/entities/organization.rs`
- `crates/vaultic-server/src/entities/org_member.rs`
- `crates/vaultic-server/src/entities/org_invite.rs`

## Implementation Steps

### 1. Migration: organizations table

```rust
// m20260325_000009_create_organizations.rs
#[derive(DeriveIden)]
pub enum Organizations {
    Table, Id, OwnerId, EncryptedName, CreatedAt, UpdatedAt,
}

// id UUID PK default gen_random_uuid()
// owner_id UUID NOT NULL FK→users ON DELETE CASCADE
// encrypted_name TEXT NOT NULL — AES-256-GCM encrypted with org key
// created_at TIMESTAMPTZ DEFAULT NOW()
// updated_at TIMESTAMPTZ DEFAULT NOW()
```

### 2. Migration: org_members table

```rust
// m20260325_000010_create_org_members.rs
#[derive(DeriveIden)]
pub enum OrgMembers {
    Table, Id, OrgId, UserId, Role, EncryptedOrgKey,
    InvitedAt, AcceptedAt,
}

// id UUID PK
// org_id UUID NOT NULL FK→organizations ON DELETE CASCADE
// user_id UUID NOT NULL FK→users ON DELETE CASCADE
// role VARCHAR(20) NOT NULL DEFAULT 'member' — 'owner'|'admin'|'member'
// encrypted_org_key TEXT NOT NULL — RSA-OAEP encrypted org symmetric key
// invited_at TIMESTAMPTZ DEFAULT NOW()
// accepted_at TIMESTAMPTZ — NULL until invite accepted
// UNIQUE(org_id, user_id)
```

### 3. Migration: org_invites table

```rust
// m20260325_000011_create_org_invites.rs
#[derive(DeriveIden)]
pub enum OrgInvites {
    Table, Id, OrgId, InviteCode, Role, CreatedById,
    ExpiresAt, AcceptedById, AcceptedAt, CreatedAt,
}

// id UUID PK
// org_id UUID NOT NULL FK→organizations ON DELETE CASCADE
// invite_code VARCHAR(32) NOT NULL UNIQUE — random alphanumeric
// role VARCHAR(20) NOT NULL DEFAULT 'member'
// created_by_id UUID NOT NULL FK→users
// expires_at TIMESTAMPTZ NOT NULL — default NOW() + 7 days
// accepted_by_id UUID FK→users — set when someone accepts
// accepted_at TIMESTAMPTZ
// created_at TIMESTAMPTZ DEFAULT NOW()
// INDEX(invite_code)
```

### 4. Migration: add org_id to vault_items

```rust
// m20260325_000012_add_org_id_to_vault_items.rs
// ALTER TABLE vault_items ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
// CREATE INDEX idx_vault_items_org ON vault_items(org_id) WHERE org_id IS NOT NULL;
```

### 5. SeaORM entities

**organization.rs:**
```rust
#[sea_orm(table_name = "organizations")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub owner_id: Uuid,
    pub encrypted_name: String,
    pub created_at: Option<DateTimeWithTimeZone>,
    pub updated_at: Option<DateTimeWithTimeZone>,
}
// Relations: HasMany OrgMembers, HasMany OrgInvites, HasMany VaultItems
// BelongsTo User (owner)
```

**org_member.rs:**
```rust
#[sea_orm(table_name = "org_members")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub org_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub encrypted_org_key: String,
    pub invited_at: Option<DateTimeWithTimeZone>,
    pub accepted_at: Option<DateTimeWithTimeZone>,
}
// Relations: BelongsTo Organization, BelongsTo User
```

**org_invite.rs:**
```rust
#[sea_orm(table_name = "org_invites")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub org_id: Uuid,
    pub invite_code: String,
    pub role: String,
    pub created_by_id: Uuid,
    pub expires_at: DateTimeWithTimeZone,
    pub accepted_by_id: Option<Uuid>,
    pub accepted_at: Option<DateTimeWithTimeZone>,
    pub created_at: Option<DateTimeWithTimeZone>,
}
```

### 6. Update existing entities

- `vault_item.rs`: add `pub org_id: Option<Uuid>` + BelongsTo Organization relation
- `user.rs`: add HasMany OrgMembers relation

### 7. Register all migrations in lib.rs

## Todo

- [ ] Create migration 000009_create_organizations
- [ ] Create migration 000010_create_org_members
- [ ] Create migration 000011_create_org_invites
- [ ] Create migration 000012_add_org_id_to_vault_items
- [ ] Create entity organization.rs
- [ ] Create entity org_member.rs
- [ ] Create entity org_invite.rs
- [ ] Update entity vault_item.rs (add org_id)
- [ ] Update entity user.rs (add OrgMembers relation)
- [ ] Update entities/mod.rs
- [ ] Register migrations in lib.rs
- [ ] `cargo build -p vaultic-migration` passes
- [ ] Run migrations against dev DB

## Success Criteria

- All 4 migrations run cleanly
- Entities compile with correct bidirectional relations
- FK cascades: delete org → deletes members, invites; vault_items.org_id set NULL
- UNIQUE(org_id, user_id) on org_members enforced
- invite_code has unique index

## Security Considerations

- `encrypted_org_key` is RSA-OAEP wrapped — server cannot decrypt
- `encrypted_name` encrypted with org key — server sees only ciphertext
- Invite codes: 32-char random, expires in 7 days, single-use
- org_id on vault_items nullable — personal items unaffected
- Owner role not assignable via invite (only on org creation)
