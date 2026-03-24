---
phase: 7
priority: medium
status: pending
estimated_days: 5
depends_on: [5]
---

# Phase 7: Secure Share (Password Push)

## Overview
Share credentials via temporary links with TTL and view limits. Zero-knowledge: encryption key in URL fragment, server never sees plaintext.

## Design Screens (5)
- **P7-01** Share - From Vault (toggle active: "From Vault")
- **P7-02** Share - Quick Share (toggle active: "Quick Share")
- **P7-03** Share - Link Created (success + copy link)
- **P7-04** Recipient - View Prompt (web page, "View Credential" button)
- **P7-05** Recipient - Secret Revealed (raw text/structured + copy + warning)

## User Flow
```
Bottom Nav "Share" tab
    │
    ▼
P7-01 / P7-02 (same screen, toggle switches content)
    ├── [From Vault] → select credential card → checkboxes (user/pass)
    └── [Quick Share] → text area (raw input) → "Also save to vault?" checkbox
    │
    ▼  Click "Generate Secure Link"
P7-03 Link Created
    ├── Success icon + "Secure Link Created!"
    ├── Link box + Copy Link button
    ├── Expiry info (TTL + views)
    └── Done → back to vault
    │
    ▼  Recipient opens URL
P7-04 View Prompt
    ├── Vaultic branding
    ├── Warning: "This link can only be viewed 1 time"
    └── "View Credential" button
    │
    ▼  Click View
P7-05 Secret Revealed
    ├── From Vault → structured: USERNAME + PASSWORD fields + copy
    └── Quick Share → raw text block + "Copy to Clipboard"
    ├── Warning: "This will disappear when you close this page"
    └── "Powered by Vaultic" branding
```

## Architecture

```
packages/extension/src/
├── components/share/
│   ├── SharePage.tsx           # Main share screen with toggle
│   ├── ShareFromVault.tsx      # "From Vault" tab content
│   ├── ShareQuickText.tsx      # "Quick Share" tab content
│   ├── ShareOptions.tsx        # Reusable TTL + max views selector
│   └── ShareLinkResult.tsx     # P7-03: success + copy link

packages/web/src/               # Recipient pages (served by Axum)
├── share-page.html             # P7-04: view prompt
├── share-revealed.html         # P7-05: decrypted content
└── share-decrypt.ts            # WebCrypto decrypt from URL fragment
```

## Encryption Flow (unchanged)
```
Sender: share_key = random(32) → encrypt(share_key, plaintext) → POST /api/share → URL#base64(share_key)
Recipient: URL fragment → GET /api/share/:id → decrypt(share_key, encrypted_data) → display
```

## Implementation Steps

### 1. SharePage with toggle (3h) — Design: P7-01, P7-02
```typescript
function SharePage() {
  const [mode, setMode] = useState<'vault' | 'quick'>('vault');
  return (
    <div>
      <SegmentedControl value={mode} onChange={setMode}
        options={[{value:'vault',label:'From Vault'},{value:'quick',label:'Quick Share'}]} />
      {mode === 'vault' ? <ShareFromVault /> : <ShareQuickText />}
      <ShareOptions ttl={ttl} maxViews={maxViews} />
      <Button onClick={generateLink}>Generate Secure Link</Button>
    </div>
  );
}
```

### 2. ShareFromVault component (2h) — Design: P7-01
- Shows source credential card (icon + site + email)
- Checkboxes: Username, Password (both checked by default)
- Encrypt selected fields as JSON

### 3. ShareQuickText component (2h) — Design: P7-02
- Text area: "Paste any secret here..."
- Checkbox: "Also save to vault" (unchecked by default)
- Encrypt raw text as-is (not JSON)

### 4. ShareOptions component (1h) — Shared
- TTL selector: [1 hour] [24 hours] [7 days] [No limit] — pill buttons
- Max views selector: [1] [3] [5] [10] [No limit] — pill buttons
- "No limit" = TTL null (never expires) or max_views null (unlimited views)
- DB: `expires_at = NULL` means no expiry, `max_views = NULL` means unlimited
- Warning: show caution text when "No limit" selected ("This link will remain active until manually revoked")

### 5. ShareLinkResult screen (2h) — Design: P7-03
- Success icon (green circle-check)
- Link display box + copy icon
- "Copy Link" primary button
- Expiry info card: TTL + views + "whichever comes first"
- "Done" secondary button → navigate back

### 6. Recipient view prompt page (3h) — Design: P7-04
- Static HTML served by Axum at GET /s/:id
- Vaultic branding (shield-check icon)
- Warning: "This link can only be viewed X time(s)"
- "View Credential" button → triggers decrypt

### 7. Recipient revealed page (3h) — Design: P7-05
After clicking "View Credential":
- Detect content type from decrypted data:
  - If valid JSON with username/password → structured view (labels + copy per field)
  - If raw text → monospace text block + "Copy to Clipboard" button
- Warning (yellow): "This will disappear when you close this page"
- "Powered by Vaultic" footer (marketing)

### 8. Server: serve share pages (1h)
```rust
// GET /s/:id → serve share-page.html (static, same for all shares)
// JavaScript on page reads URL fragment and calls GET /api/share/:id
```

### 9. Context menu (1h)
Right-click selected text → "Share securely with Vaultic" → opens Quick Share pre-filled

## Todo List
- [ ] SharePage with segmented toggle (From Vault / Quick Share)
- [ ] ShareFromVault: credential card + checkboxes
- [ ] ShareQuickText: text area + "save to vault" checkbox
- [ ] ShareOptions: TTL + max views pill selectors
- [ ] Generate share: encrypt + POST + build URL with fragment key
- [ ] ShareLinkResult: success screen + copy link + expiry info
- [ ] Recipient view prompt page (HTML + JS)
- [ ] Recipient revealed: structured (from vault) vs raw (quick share)
- [ ] Recipient decrypt logic (WebCrypto, URL fragment)
- [ ] Server route: GET /s/:id → serve static page
- [ ] Context menu: "Share securely with Vaultic"
- [ ] Test: create from vault → view → structured display
- [ ] Test: create quick share → view → raw text display
- [ ] Test: expired/exceeded share → error page
- [ ] Test: URL fragment never sent to server

## Success Criteria
- Toggle switches between From Vault and Quick Share seamlessly
- From Vault: share generates URL, recipient sees structured username/password
- Quick Share: paste raw text → generate URL, recipient sees raw text block
- Link Created screen shows expiry info + copy button
- Recipient page works without login/extension
- After max_views or TTL, share returns error page
- URL fragment (#key) never sent to server (verified in network tab)
- "Powered by Vaultic" branding on all recipient pages
