# Phase 2: Hybrid Share (Data in URL, Metadata on Server)

## Overview
- **Priority:** P1
- **Status:** Complete
- **Effort:** 4h
- **Description:** Unified share: encrypted data in URL fragment, server stores only metadata (view count, expiry). Tamper-proof access control.

## Context
- [Brainstorm: Hybrid Share](../reports/brainstorm-260328-1204-hybrid-share-architecture.md)
- [Original brainstorm](../reports/brainstorm-260328-1053-offline-first-login-share.md)
- Depends on Phase 1 (auth mode awareness)

## Key Insights
- Server NEVER stores encrypted data → zero-knowledge++
- Server ONLY stores metadata (~100 bytes/share): share_id, max_views, current_views, expires_at
- Encrypted data ALWAYS in URL fragment → never sent to server
- ONE share model for all users (no "offline" vs "online" toggle)
- View counting + expiry = tamper-proof (server-enforced)
- Offline user: queue metadata POST, link inactive until synced

## Requirements

### Functional
- All shares have expiry + view limit (same UX for offline/online users)
- Encrypted data embedded in URL fragment (~2KB limit)
- Server checks access (view count + expiry) before allowing decrypt
- Offline users can create shares (metadata queued, link activates when online)
- Warning for data exceeding URL limit
- Backward compatible with old share links

### Non-Functional
- Same AES-256-GCM encryption
- Cross-browser URL fragment support
- Atomic view count increment (server-side)

## Architecture

### URL Format
```
https://{host}/s/{share_id}#v1.{iv}.{ciphertext}.{key}
                 ^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^^
                 path (sent)    fragment (NEVER sent to server)

Server receives: share_id only
Server NEVER receives: iv, ciphertext, key
```

### Create Share Flow
```
User → select credential + expiry + max_views
  ↓
Client: encrypt data → AES-256-GCM → get iv, ciphertext
Client: generate random key, random share_id
  ↓
POST /api/v1/shares { share_id, max_views, ttl_hours }
  (NO encrypted_data — ~100 bytes)
  ↓
Build URL: /s/{share_id}#v1.{iv}.{ciphertext}.{key}
  ↓
Copy to clipboard
```

### View Share Flow
```
Recipient opens URL → share-page.html loads
  ↓
Extract share_id from path, fragment data from hash
  ↓
GET /api/v1/shares/{share_id}/check
  Server: check expiry, check views < max → increment atomically
  ↓
200 OK → decrypt from URL fragment → display
403/410 → show "expired" or "max views reached"
```

### Offline Create (Queued)
```
Offline user creates share
  ↓
Encrypt + build URL immediately (user gets the link)
  ↓
Metadata POST queued in sync queue
  ↓
Share page shows "Link not yet active" if metadata not synced
  ↓
User goes online → queue syncs → link activates
```

## Related Code Files

### Modify
| File | Change |
|------|--------|
| `client/packages/crypto/src/share-crypto.ts` | Add `encryptShareToUrl()` / `decryptShareFromUrl()` |
| `client/apps/extension/src/components/share/share-page.tsx` | Unified share form (expiry + views + size indicator) |
| `backend/src/static/share-page.html` | Check server → decrypt from URL fragment |
| `backend/src/routes/share-route.ts` | New metadata-only endpoint, modify existing endpoints |
| `backend/src/services/share-service.ts` | Remove encrypted_data handling, add metadata-only create |
| `backend/src/models/secure-share-model.ts` | Remove encryptedData field |

### Create
| File | Purpose |
|------|---------|
| `client/packages/crypto/src/url-share-codec.ts` | URL-safe base64url encode/decode for share data |

## Implementation Steps

### Step 1: Add URL share codec to @vaultic/crypto
Create `client/packages/crypto/src/url-share-codec.ts`:

```typescript
// base64url encode/decode (no padding, URL-safe)
function toBase64Url(data: Uint8Array): string
function fromBase64Url(str: string): Uint8Array

// Encode: v1.{iv}.{ciphertext}.{key}
function encodeShareFragment(iv: Uint8Array, ciphertext: Uint8Array, key: Uint8Array): string

// Decode fragment back to components
function decodeShareFragment(fragment: string): { version: string, iv: Uint8Array, ciphertext: Uint8Array, key: Uint8Array }

// Size estimation
const MAX_FRAGMENT_LENGTH = 2000;
function isWithinUrlLimit(plaintext: string, baseUrl: string): boolean
```

### Step 2: Add encryptShareToUrl / decryptShareFromUrl
Add to `share-crypto.ts` — same as before but used in unified flow.

### Step 3: Update backend — metadata-only share

Modify `backend/src/models/secure-share-model.ts`:
- Remove `encryptedData` field
- Keep: `_id` (share_id), `userId`, `maxViews`, `currentViews`, `expiresAt`, `createdAt`

Modify `backend/src/routes/share-route.ts`:
- `POST /api/v1/shares`: accept `{ share_id, max_views, ttl_hours }` only. No encrypted_data.
- `GET /api/v1/shares/{id}/check`: new endpoint — check expiry + views, increment atomically, return 200/403/410
- `GET /api/v1/shares/{id}`: keep for backward compat with old links (returns encrypted_data if exists)
- `DELETE /api/v1/shares/{id}`: unchanged

Modify `backend/src/services/share-service.ts`:
- `createShare()`: no encrypted_data param
- `checkShareAccess(shareId)`: new — atomic check + increment, return { allowed, reason }

### Step 4: Update share-page.html (backend static)

New flow:
```
1. Extract share_id from path /s/{id}
2. Extract fragment from URL hash
3. If fragment starts with "v1.":
   a. Call GET /api/v1/shares/{share_id}/check
   b. If 200 → parse fragment, decrypt, display
   c. If 403/410 → show expired/limit page
4. Else (legacy):
   a. Extract key from fragment
   b. Fetch encrypted_data from server (old flow)
   c. Decrypt + display
```

### Step 5: Update SharePage component (extension)

Modify `share-page.tsx`:
- Remove dual mode toggle (URL/Server)
- Unified form: credential + expiry + max views + size indicator
- On submit:
  1. Encrypt data → encryptShareToUrl()
  2. Generate share_id (12 random alphanumeric)
  3. If online: POST metadata immediately
  4. If offline: queue in sync queue, show "link activates when online" warning
  5. Build URL: `/s/{share_id}#${fragment}`
  6. Show Link Created screen
- Size indicator: "~0.5 KB / 2 KB"
- Warning if data > 2KB: "Data too large. Reduce notes."

### Step 6: Build & verify
- `pnpm build` all affected packages
- Test: create share → open link → server checks → decrypts from URL

## Todo List
- [x] Create `url-share-codec.ts` in @vaultic/crypto
- [x] Add `encryptShareToUrl()` / `decryptShareFromUrl()` to share-crypto.ts
- [x] Export new functions from @vaultic/crypto index
- [x] Update SecureShare model — remove encryptedData field
- [x] Update share-route.ts — metadata-only POST + new /check endpoint
- [x] Update share-service.ts — createShare (no data), checkShareAccess (new)
- [x] Update share-page.html — check server → decrypt from URL fragment
- [x] Update share-page.tsx — unified form, no dual toggle
- [x] Build & verify all packages
- [x] Fixed API paths from /api/auth/* and /api/share/* to /api/v1/* (code review fix)
- [x] Added duplicate share ID protection (code review fix)
- [x] Added warning when share metadata POST fails (code review fix)

## Success Criteria
- Share creates URL with encrypted data in fragment + registers metadata on server
- Share page checks server for access → decrypts from URL fragment
- Expiry and view limits enforced server-side (tamper-proof)
- Server NEVER stores encrypted data
- Offline user can create share (queued, activates when online)
- Old server-based share links still work (backward compat)
- URL under 2KB for typical credentials
- Warning shown when data exceeds limit

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| URL too long in messaging apps | Medium | Hard 2KB limit + warning |
| Offline share link opened before metadata synced | Medium | "Link not yet active" message on share page |
| Backward compat with old share links | Low | Detect fragment format (v1.* vs key-only) |
| Server down → can't view share | Medium | Show "server unavailable, try later" (data safe in URL) |

## Security Considerations
- AES-256-GCM encryption — same strength
- Key in URL fragment — NEVER sent to server
- View counting: server-side atomic (MongoDB findOneAndUpdate)
- Expiry: server-side TTL check
- Server stores zero encrypted data — pure metadata
- Anyone with full URL + server access = can decrypt (by design)
