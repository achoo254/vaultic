---
phase: 4
title: Share Credential
status: pending
effort: medium
---

# Phase 4: Share Credential — Full Rewrite

## Overview
Replace placeholder share page with full vault-item sharing + quick share. Port from extension's `share-page.tsx` (247 lines). Requires crypto wiring + server API call.

## Context
- Extension ref: `client/apps/extension/src/components/share/share-page.tsx`
- Crypto: `encryptShareToUrl`, `estimateFragmentSize`, `MAX_FRAGMENT_LENGTH` from `@vaultic/crypto`
- API: POST `/api/v1/shares/metadata` (already exists on backend)
- Web auth: `fetchWithAuth` from `lib/web-auth-fetch.ts`
- Store: `useVaultStore((s) => s.items)`, `useAuthStore`

## Changes

### 1. Rewrite `pages/share-page.tsx`

**State:**
```typescript
mode: 'vault' | 'quick'           // toggle between modes
// Vault mode
selectedItem: DecryptedVaultItem | null
shareUsername: boolean (true)
sharePassword: boolean (true)
// Quick mode
quickText: string
// Shared
ttlHours: number | null (24)
maxViews: number | null (1)
loading: boolean
error: string
result: { url, ttl, views, warning? } | null
```

**Mode toggle:** Two buttons — "From Vault" | "Quick Share"

**Vault mode UI:**
- Item selector: scrollable list of vault items (Card rows)
- Selected item preview: name + username display
- Checkboxes: "Share username" + "Share password"
- At least one must be checked

**Quick mode UI:**
- Textarea for freeform text
- Description text explaining encryption

**Shared controls (ShareOptions section):**
- TTL dropdown: 1h, 6h, 24h, 48h, 7d, No expiry (null)
- Max views dropdown: 1, 3, 5, 10, Unlimited (null)
- Size indicator: `~{estimatedKB}KB / {MAX_KB}KB`

**Generate flow:**
```typescript
async function handleGenerate() {
  const plaintext = mode === 'vault'
    ? JSON.stringify({
        name: selectedItem.credential.name,
        ...(shareUsername && { username: selectedItem.credential.username }),
        ...(sharePassword && { password: selectedItem.credential.password }),
      })
    : quickText.trim();

  if (!plaintext) return;

  // Check size
  const size = estimateFragmentSize(new TextEncoder().encode(plaintext).length);
  if (size > MAX_FRAGMENT_LENGTH) { setError('Too large'); return; }

  // Encrypt
  const { fragment, shareId } = await encryptShareToUrl(plaintext);

  // Post metadata to server (optional — works without for offline)
  try {
    await fetchWithAuth('/api/v1/shares/metadata', {
      method: 'POST',
      body: JSON.stringify({
        share_id: shareId,
        max_views: maxViews,
        ttl_hours: ttlHours,
      }),
    });
  } catch { /* offline — share still works via URL */ }

  // Build URL
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/s/${shareId}?d=${encodeURIComponent(fragment)}`;
  setResult({ url, ttl: ttlHours, views: maxViews });
}
```

**Result view:**
- URL display (monospace, word-break)
- Copy button
- "Create Another" button to reset

### 2. Verify crypto imports
Check `@vaultic/crypto` exports:
- `encryptShareToUrl(plaintext: string)` → `{ fragment, shareId }`
- `estimateFragmentSize(byteLength: number)` → number
- `MAX_FRAGMENT_LENGTH` constant

If missing from package exports, check extension's import path and ensure web can access.

### 3. Verify API endpoint
Backend route `/api/v1/shares/metadata` — already exists in `share-route.ts`:
- POST body: `{ share_id, max_views?, ttl_hours? }`
- Auth: `authOptional` (works for offline users too)

## Files
| Action | File |
|--------|------|
| REWRITE | `client/apps/web/src/pages/share-page.tsx` |

## Risk
- **Crypto import**: `encryptShareToUrl` may not be exported from `@vaultic/crypto` barrel. May need to check/add export.
- **Share URL format**: Extension uses `SHARE_BASE_URL` env var. Web should use `window.location.origin`.
- **Offline mode**: If user not logged in, server metadata call fails silently — share still works via URL-only encryption.

## Success Criteria
- [ ] Mode toggle between "From Vault" and "Quick Share"
- [ ] Vault mode: select item, choose username/password checkboxes
- [ ] Quick mode: textarea input
- [ ] TTL + max views dropdowns work
- [ ] Size indicator shows estimated vs max
- [ ] Generate creates encrypted URL
- [ ] Copy button copies URL
- [ ] "Create Another" resets form
- [ ] Works offline (skip server call gracefully)
- [ ] `tsc --noEmit` passes
