# Phase 3: Store Listing Content

## Status: `pending`
## Priority: High (blocker for submission)
## Effort: 0.5 day

---

## Overview

Soạn tất cả text content cho Chrome Web Store listing: description, permission justifications, privacy practices disclosures.

## Requirements

### Short Description (max 132 chars, shown in search)

```
Open-source, zero-knowledge password manager. Autofill, password generator, encrypted sharing. Your data stays yours.
```

### Full Description (EN)

Structure:
1. **Opening hook** — what Vaultic is (2-3 sentences)
2. **Key features** — bullet list
3. **Security model** — zero-knowledge explanation
4. **Open source** — link to GitHub
5. **Permissions explained** — why each permission is needed

Keywords to include naturally: password manager, zero-knowledge, autofill, open source, encrypted, secure, privacy

### Full Description (VI)

Bản dịch tiếng Việt của full description.

### Permission Justifications (6 entries)

Fill vào Chrome Developer Dashboard khi submit:

| Permission | Justification Text |
|-----------|-------------------|
| `storage` | Stores encrypted vault data locally using IndexedDB for offline-first password management. No plaintext is ever stored. |
| `activeTab` | Detects login forms on the currently active page to offer credential autofill. Only accesses page DOM when the user interacts with the extension. |
| `scripting` | Injects credential autofill scripts into detected login forms using a secure fill-by-ID pattern. The content script never receives plaintext passwords — only element identifiers. |
| `alarms` | Schedules the auto-lock timer after a configurable inactivity period and manages optional cloud sync intervals for background synchronization. |
| `idle` | Detects user inactivity to automatically lock the vault, preventing unauthorized access on unattended devices. |
| `host_permissions (<all_urls>)` | As a password manager, Vaultic must detect and fill login forms on any website the user visits. Content scripts use a secure fill-by-ID pattern where they receive only DOM element identifiers, never plaintext credentials. The extension is fully open-source: https://github.com/achoo254/vaultic |

### Privacy Practices Tab

| Question | Answer |
|----------|--------|
| Single purpose description | Password management with autofill, password generation, and encrypted sharing |
| Authentication information | Yes — Functionality |
| Personally identifiable info | Yes (email for optional registration) — Functionality |
| Financial/payment info | Yes (encrypted payment cards in vault) — Functionality |
| Health info | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Encrypted in transit | Yes |
| Encrypted at rest | Yes |
| User can request deletion | Yes |
| No selling to 3rd parties | Yes |
| No unrelated data use | Yes |
| No creditworthiness use | Yes |

## Related Code Files

- **Reference:** `client/apps/extension/wxt.config.ts` — verify permission list matches
- **Reference:** `docs/security-policy.md` — crypto details for description

## Implementation Steps

1. Write full EN description (~500-800 words)
2. Translate to VI
3. Prepare permission justifications (copy from table above, adjust if needed)
4. Document privacy practices answers
5. Save all content in a single reference file for submission day

## Todo List

- [ ] Write EN full description
- [ ] Write VI full description
- [ ] Finalize permission justifications
- [ ] Document privacy practices answers
- [ ] Save as `store-listing-content.md` in this plan directory

## Success Criteria

- Short description under 132 chars
- Full description includes all keywords naturally
- Permission justifications specific, not generic
- Privacy practices consistent with actual extension behavior
