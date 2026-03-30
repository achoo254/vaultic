# Phase 3: Extension Content Scripts & Autofill

## Context Links
- [Extension Audit](../reports/code-reviewer-260330-0936-extension-full-security-review.md)

## Overview
- **Priority:** P0 (E-C4) + P1 (E-C5, E-H3, E-C3)
- **Status:** Completed
- **Effort:** 3h
- **Parallel-safe:** Yes — owns `content.ts`, `credential-handler.ts`, content/ dir, `export-vault.tsx`

## Items Covered

| # | ID | Severity | Issue |
|---|-----|----------|-------|
| 6 | E-C5 | P1 | Restrict content script to http/https only |
| 7 | E-H3 | P1 | Fix domain matching (extract+compare, not includes) |
| - | E-C3 | P1 | Fill-by-ID pattern (background fills via chrome.scripting) |
| - | E-C4 | P0 | Fix "encrypted" export that is actually plaintext |

## Key Insights

- Content script runs on `<all_urls>` including `chrome://`, `file://` — should be HTTP/HTTPS only
- Domain matching uses `url.includes(extractDomain(cred.url))` — `evil.com` matches `not-evil.com`
- Plaintext passwords cross message boundary from background to content script
- "Encrypted (.json)" export format is actually plaintext JSON of decrypted credentials

## Related Code Files

### Files to Modify
- `client/apps/extension/src/entrypoints/content.ts` — restrict matches
- `client/apps/extension/src/entrypoints/background/credential-handler.ts` — fix domain matching, implement fill-by-ID
- `client/apps/extension/src/content/field-filler.ts` — accept fill-by-ID from background
- `client/apps/extension/src/components/settings/export-vault.tsx` — fix encrypted export

### Files to Create
- None

---

## Implementation Steps

### Item 6: Restrict Content Script (E-C5)

File: `client/apps/extension/src/entrypoints/content.ts`, line 9

```typescript
// Change:
  matches: ['<all_urls>'],
// To:
  matches: ['http://*/*', 'https://*/*'],
```

One line change. Prevents injection on `chrome://`, `file://`, `chrome-extension://`, `about:`, etc.

---

### Item 7: Fix Domain Matching (E-H3)

File: `client/apps/extension/src/entrypoints/background/credential-handler.ts`

**Line 30 — getMatchingCredentials():**
```typescript
// Change:
if (cred.url && url.includes(extractDomain(cred.url))) {
// To:
if (cred.url && extractDomain(url) === extractDomain(cred.url)) {
```

**Line 62 — handleCapturedCredential():**
```typescript
// Change:
if (cred.url && data.url.includes(extractDomain(cred.url)) && cred.username === data.username) {
// To:
if (cred.url && extractDomain(data.url) === extractDomain(cred.url) && cred.username === data.username) {
```

Both changes: extract domain from BOTH sides and compare directly. The `extractDomain` function already exists in `crypto-helpers.ts`.

**Verify extractDomain implementation:**
Check that `extractDomain` properly strips protocol, port, and path. If it returns `google.com` for `https://google.com/login`, the comparison is correct.

---

### Item E-C3: Fill-by-ID Pattern

**Current flow (insecure):**
1. Content script asks: "credentials for example.com?"
2. Background decrypts and sends plaintext `{ password: "s3cret" }` via message
3. Content script fills the form with received plaintext

**New flow (secure):**
1. Content script asks: "credentials for example.com?"
2. Background responds with `{ matches: [{ id, name, username }] }` — NO passwords
3. User selects a credential (or auto-selects if single match)
4. Content script sends: "fill credential ID xyz"
5. Background fills directly via `chrome.scripting.executeScript`

**Step 1: Modify getMatchingCredentials() return type**
File: `credential-handler.ts`
```typescript
// Remove password from returned matches:
matches.push({
  id: item.id,
  name: cred.name || cred.url,
  username: cred.username || '',
  // password removed — never sent to content script
});
```

**Step 2: Add fillCredential() handler in background**
File: `credential-handler.ts`
```typescript
/** Fill credential by ID — background decrypts and fills directly. */
export async function fillCredentialById(credentialId: string, tabId: number) {
  const key = await getEncKey();
  if (!key) return;

  const store = new IndexedDBStore();
  const userId = await getCurrentUserId();
  const item = await store.getItem(userId, credentialId);
  if (!item) return;

  const json = await decrypt(key, item.encrypted_data);
  const cred = JSON.parse(json);

  // Fill directly via chrome.scripting — password never crosses message boundary
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (username: string, password: string) => {
      const inputs = document.querySelectorAll('input');
      let userField: HTMLInputElement | null = null;
      let passField: HTMLInputElement | null = null;

      for (const input of inputs) {
        const type = input.type.toLowerCase();
        const name = (input.name + input.id + input.autocomplete).toLowerCase();
        if (type === 'password' || name.includes('pass')) passField = input;
        else if (type === 'email' || type === 'text' || name.includes('user') || name.includes('email') || name.includes('login')) userField = input;
      }

      const setNativeValue = (el: HTMLInputElement, val: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      if (userField) setNativeValue(userField, username);
      if (passField) setTimeout(() => setNativeValue(passField!, password), 50);
    },
    args: [cred.username || '', cred.password || ''],
  });
}
```

**Step 3: Update message listener in background.ts**
The background message handler needs to route `FILL_CREDENTIAL` messages:
```typescript
case 'FILL_CREDENTIAL':
  await fillCredentialById(msg.credentialId, sender.tab?.id);
  break;
```

**Step 4: Update content script autofill UI**
The autofill dropdown currently expects `{ password }` in the credential data. Update to:
1. Display credential list (name + username only)
2. On selection, send `{ type: 'FILL_CREDENTIAL', credentialId: id }` to background
3. Background handles the actual filling

This requires updating the autofill icon/dropdown components in `content/` directory. The key change: the content script NEVER receives or handles plaintext passwords.

---

### Item E-C4: Fix Encrypted Export

File: `client/apps/extension/src/components/settings/export-vault.tsx`

**Current (line 33-34):** Exports `items.map((i) => i.credential)` — these are decrypted credentials from Zustand store.

**Fix option:** Rename to make it honest. The export is plaintext JSON.

```typescript
// Change the "encrypted" option label:
<span style={optionLabel}>JSON (.json)</span>
<span style={optionHint}>Plaintext</span>
```

Also update the format type:
```typescript
const [format, setFormat] = useState<'json' | 'csv'>('json');
```

And add a warning for JSON export too:
```typescript
{format === 'json' && (
  <div style={warningStyle}>
    <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
    JSON exports are unencrypted. Handle with care.
  </div>
)}
```

**Alternative (actually encrypt):** Would require prompting for a passphrase, deriving a key, encrypting the JSON blob. This is a feature, not a fix — defer to future. For now, honest labeling is sufficient.

---

## Todo List

- [x] Change content script matches from `<all_urls>` to `http://*/*, https://*/*` (content.ts)
- [x] Fix domain matching in `getMatchingCredentials()` — compare extracted domains (credential-handler.ts:30)
- [x] Fix domain matching in `handleCapturedCredential()` — same pattern (credential-handler.ts:62)
- [x] Remove password from `getMatchingCredentials()` return value
- [x] Add `fillCredentialById()` function using `chrome.scripting.executeScript`
- [x] Add `FILL_CREDENTIAL` message handler in background
- [x] Update autofill dropdown to send credential ID instead of receiving password
- [x] Rename "Encrypted (.json)" to "JSON (.json)" with "Plaintext" hint (export-vault.tsx)
- [x] Add warning for JSON export format (export-vault.tsx)
- [x] Add `scripting` permission to manifest if not already present
- [x] Run `tsc --noEmit` for extension
- [x] Manual test: autofill flow on a login page, export both formats

## Success Criteria

1. Content script does NOT run on `chrome://`, `file://` pages
2. Credential for `evil.com` does NOT match `not-evil.com`
3. Plaintext passwords never appear in chrome extension message passing
4. Export UI honestly labels JSON format as plaintext
5. Autofill still works end-to-end via fill-by-ID pattern

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| chrome.scripting.executeScript requires permissions | Medium | Medium | Check manifest for `scripting` permission; WXT may auto-add |
| Fill-by-ID field detection less reliable than content script detection | Medium | Medium | Reuse field detection logic from field-filler.ts in injected script |
| Restricting to http/https breaks users on local file:// pages | Low | Low | Password managers don't fill on file:// — this is expected |
| Autofill dropdown UI changes need visual testing | Medium | Low | Visual regression only — functionality preserved |

## Security Considerations

- Restricting content script to HTTP/HTTPS prevents injection into privileged browser pages
- Domain comparison eliminates subdomain-matching attacks
- Fill-by-ID ensures plaintext passwords never enter the content script context
- Honest export labeling prevents false sense of security

## Next Steps

- Phase 5 may need to update content script tests if they exist
- Consider future: actually encrypted export with passphrase derivation
- Monitor for `chrome.scripting` permission approval in Chrome Web Store review
