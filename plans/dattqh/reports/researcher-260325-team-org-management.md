# Team/Organization Management Research Report
**Date:** 2026-03-25 | **Duration:** 5 searches + codebase review

## Executive Summary
For zero-knowledge password managers, team vaults require: (1) org-level symmetric key wrapped per-member via RSA, (2) role-based middleware + handler checks, (3) per-item team encryption metadata, (4) M2M user↔team with cascade deletes. Vaultic's offline-first model requires design to support optional sync while maintaining encryption invariants.

---

## 1. Team Vault Zero-Knowledge Encryption

**How Bitwarden Does It:**
- **Organization Symmetric Key (Org Key):** Server generates and immediately encrypts with creator's RSA public key using RSA-OAEP. Unencrypted Org Key never stored server-side.
- **Member Access:** When adding member, server encrypts Org Key with member's RSA public key. Member decrypts using private key (held client-side only).
- **Vault Items:** Each item encrypted with Org Key client-side before upload. Server stores only ciphertext.
- **Result:** Server cannot decrypt vault items. Key rotation requires re-encryption and per-member re-wrapping.

**Key Constraint:** RSA key exchange requires public key infrastructure. Vaultic must store user RSA public keys server-side.

**Vaultic Adaptation for Offline-First:**
- Org Key derivation: Use HKDF(master_password, "org_context", org_id) so org key can be regenerated locally without sync
- **OR** store encrypted Org Key in user's sync blob (not server) for multi-device org access
- When sync disabled: org functionality offline, items stay local-only
- When sync enabled: upload encrypted Org Key wrapper per member

---

## 2. Role-Based Access Control (RBAC) in Axum

**Recommended Patterns:**
- **Middleware layer** (tower): Extract role from JWT, store in `Request::Extensions`. Fast, reusable across routes.
- **Handler-level checks** for fine-grained permissions (e.g., "user can edit this folder?")
- **Popular crates:**
  - `axum-login`: Built-in role auth backend
  - `axum-casbin`: Policy-based access control (ACL/RBAC/ABAC)
  - `axum-gate`: Hierarchical role inheritance (owner > admin > member > viewer)

**Recommended Role Hierarchy for Vaultic:**
```
Owner     → Create org, invite members, change roles, delete org, manage billing
Admin     → Invite/remove members, manage collections/folders (team-level), audit logs
Member    → View/edit shared items in assigned folders/collections
Viewer    → Read-only access to assigned items
```

**Implementation:** Store role + org_id in JWT claims, check at handler level for resource-specific permissions.

---

## 3. Shared Vault Encryption Architecture

**Key Rotation Strategy:**
- NIST SP 800-38D: Rotate AES-256-GCM before ~2³² encryptions (~4 billion)
- Each encrypted item stores key version ID in ciphertext prefix
- When rotating: new items use new key, old items remain encrypted with old key (can be re-encrypted in background)
- **For teams:** Org key rotation requires re-wrapping per-member (expensive but necessary)

**Member Leave Scenario:**
- Option 1: Re-encrypt all org vault items with new Org Key, re-wrap for remaining members
- Option 2: Mark items as "re-encrypt pending", batch job handles async re-encryption
- Do NOT delete member's wrapped keys immediately—allow download before purge

---

## 4. SeaORM Data Model for Teams

**Recommended Tables:**
```sql
-- Existing
users(id, email, auth_hash, encrypted_symmetric_key, rsa_public_key, ...)

-- New for teams
organizations(
  id UUID PK,
  owner_id UUID FK→users (ON DELETE CASCADE),
  encrypted_name TEXT,
  encrypted_org_key_v1 TEXT, -- For sync-less local orgs
  sync_enabled BOOL DEFAULT false,
  created_at, updated_at
)

org_members(
  id UUID PK,
  org_id UUID FK→organizations (ON DELETE CASCADE),
  user_id UUID FK→users (ON DELETE CASCADE),
  role ENUM('owner', 'admin', 'member', 'viewer'),
  encrypted_org_key TEXT, -- RSA-encrypted Org Key for this member
  invited_at, accepted_at,
  UNIQUE(org_id, user_id)
)

team_collections(
  id UUID PK,
  org_id UUID FK→organizations (ON DELETE CASCADE),
  encrypted_name TEXT,
  encrypted_metadata JSON, -- permissions, access list
  created_at, updated_at
)

-- Update vault_items to support team ownership
vault_items(
  ..., existing columns ...,
  org_id UUID FK→organizations (ON DELETE SET NULL),
  team_collection_id UUID FK→team_collections (ON DELETE SET NULL),
  -- If both NULL: personal item. If org_id set: team item
)
```

**SeaORM Cascade Pattern:**
- Use `on_delete = "Cascade"` for org_id FK on org_members, team_collections, vault_items
- Delete org → cascade delete all members, collections, team items. Personal items (org_id=NULL) unaffected
- Delete member → cascade remove from org_members; items remain (reassign to other members or keep as-is)

---

## 5. Recommended API Endpoints

**Organizations:**
- `POST /orgs` — Create org (user becomes owner)
- `GET /orgs/{org_id}` — Get org metadata
- `PUT /orgs/{org_id}` — Update org (admin+)
- `DELETE /orgs/{org_id}` — Delete org (owner only, cascade)

**Members:**
- `POST /orgs/{org_id}/members` — Invite member (admin+). Generate invite link, send email (MVP: return link in response)
- `GET /orgs/{org_id}/members` — List members + roles
- `PUT /orgs/{org_id}/members/{user_id}` — Change role (admin+)
- `DELETE /orgs/{org_id}/members/{user_id}` — Remove member (admin+)

**Collections:**
- `POST /orgs/{org_id}/collections` — Create collection (admin+)
- `GET /orgs/{org_id}/collections` — List collections
- `PUT /orgs/{org_id}/collections/{collection_id}` — Update
- `DELETE /orgs/{org_id}/collections/{collection_id}` — Delete (cascade items)

**Vault Items (team mode):**
- `POST /orgs/{org_id}/collections/{collection_id}/items` — Create team item
- `GET /orgs/{org_id}/collections/{collection_id}/items` — List (filtered by member role)
- `PUT /items/{item_id}` — Update (existing, check membership)
- `DELETE /items/{item_id}` — Delete (existing, check membership)

---

## 6. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Org key exposure** | Store encrypted via RSA-OAEP; never transmitted unencrypted |
| **Member tampering** | Validate member role in JWT + recheck at handler; sign role changes |
| **Invite link replay** | Use short-lived (1h) signed JWT tokens; rate-limit endpoints |
| **Member leaving** | Trigger key re-encryption job; client verifies received Org Key fingerprint |
| **Audit trail** | Log all role changes, member adds/removes to audit table |

---

## 7. Rust Crate Recommendations

| Crate | Purpose | Why |
|-------|---------|-----|
| `jsonwebtoken` | JWT with custom claims (role, org_id) | Already in Vaultic stack |
| `axum-gate` | Hierarchical RBAC | Better than custom middleware for complex rules |
| `sea-orm` | Already used; add relations via `.relations()` | Familiar, supports M2M with cascade |
| `rsa` (or `ring`) | RSA-OAEP key wrapping | Standard for org key distribution |
| `tokio::spawn` | Async re-encryption jobs | Vaultic already uses Tokio |

---

## 8. Migration Path (Phased)

**Phase 1 (MVP):** Single-user vaults only. Skip teams. ✓ Current state.

**Phase 2 (Future):**
- Add `organizations` + `org_members` tables
- Add RBAC middleware to all handlers
- Implement invite flow (email or CLI)
- Team collections + vault items (org_id foreign key)

**Phase 3:**
- Key rotation logic + background jobs
- Audit logging
- SSO/SAML for enterprises

---

## Unresolved Questions

1. **Org key transport:** Should Org Key be stored in user's sync blob, or regenerated locally per org? Trade-off: blob reduces server calls vs. less secret material at rest.
2. **Invite flow:** Email-based (requires SMTP) or shareable URL/code (MVP)? Current spec silent.
3. **Personal vs. team item mixing:** Should personal items be moveable to org collections? Impacts encryption model.
4. **Key rotation trigger:** Manual admin action or automatic after N encryptions? NIST recommends automatic.

---

## Summary Table

| Component | Recommendation | Vaultic Status |
|-----------|---|---|
| **Org Key** | RSA-OAEP wrap per member | Not implemented |
| **RBAC** | Middleware + handler checks | Custom auth in place; extend with roles |
| **Re-encryption** | Async job on member leave | Not needed MVP |
| **Data Model** | M2M users↔orgs + M2M orgs↔collections | Add in Phase 2 |
| **Offline sync** | Org key in local sync blob or HKDF | Design decision needed |

---

**Next Step:** Planner reviews this report → decides Phase 2 scope → delegates implementation to dev team.
