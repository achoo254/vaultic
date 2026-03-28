# Brainstorm: Hybrid Share Architecture

**Date:** 2026-03-28
**Status:** Agreed
**Supersedes:** Previous URL-only share design in brainstorm-260328-1053

---

## Problem

Previous plan had 2 share modes: URL-only (offline, no expiry/views) and Server (online, with expiry/views). User wants ALL shares to have view limits + expiry, tamper-proof.

**Fundamental constraint:** View counting + expiry enforcement REQUIRES server. Client-side only = bypassable via devtools.

## Solution: Hybrid Architecture

**Server stores ONLY metadata. Encrypted data ALWAYS in URL fragment.**

### Create Share Flow
```
1. User selects credential + expiry + max views
2. Client encrypts data → AES-256-GCM
3. POST /api/v1/shares { share_id, max_views, ttl_hours }
   (NO encrypted_data — server never sees it)
4. Build URL: vaultic.app/s/{share_id}#v1.{iv}.{ciphertext}.{key}
5. Copy to clipboard
```

### View Share Flow
```
1. Recipient opens URL
2. Share page extracts share_id from path
3. GET /api/v1/shares/{share_id}/check
   Server: check expiry + view count → increment if OK
4. If OK → decrypt data from URL fragment → display
5. If expired/max views → show error page (never decrypt)
```

### Offline User Creating Share
- Metadata POST queued in sync queue
- Link generated immediately but INACTIVE until synced
- Warning: "Share link will activate when you go online"
- Once online → sync queue pushes metadata → link becomes active

## Key Benefits

1. **Tamper-proof**: Server controls access, not client JS
2. **Zero-knowledge++**: Server NEVER stores encrypted data
3. **One share model**: No "offline" vs "online" distinction in UI
4. **Lighter server**: ~100 bytes/share metadata vs KBs of encrypted blobs
5. **Same UX**: All users get expiry + view limits

## Changes from Previous Plan

### Removed
- Dual share mode toggle (URL Share / Server Share)
- "No expiry, no view limit" for offline shares
- `encryptedData` field in SecureShare MongoDB model

### Added
- Unified share flow for all users
- Queued share creation for offline users
- "Link activating..." status for queued shares

### Modified
- `POST /api/v1/shares`: no longer accepts `encrypted_data`
- `GET /api/v1/shares/{id}`: no longer returns `encrypted_data`, just access check
- Share page: always checks server + decrypts from URL fragment
- Share UI: same form for all users (no mode toggle)

## Impact on Design Screens

| Screen | Action |
|--------|--------|
| 13a. Share - URL Mode | UPDATE: remove toggle, add expiry+views back |
| 15b. URL Share Created | UPDATE: add expiry info, remove "no limits" |
| 13. Share - From Vault (old) | DEPRECATE: replaced by unified 13a |
| 15. Share - Link Created (old) | DEPRECATE: replaced by unified 15b |

## Impact on Plan Phases

Phase 2 (URL-Based Offline Share) updates:
- Remove dual share mode logic
- Add metadata-only API endpoint
- Unified share page (check server → decrypt URL)
- Queued share for offline users

## Security Analysis

- Encrypted data: ONLY in URL fragment (never sent to server, never in HTTP logs)
- Decryption key: in URL fragment (never hits server)
- View counting: server-side atomic increment (same as current)
- Expiry: server-side TTL check (same as current)
- Metadata tamper: impossible (server controls)
- URL interception: encrypted, key in fragment = safe
