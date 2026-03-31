# Phase 1B: First-Run Privacy Consent UI

## Status: `done`
## Priority: Critical (Google requires prominent disclosure before user starts using extension)
## Effort: 0.5 day

---

## Overview

Google yêu cầu **prominent consent disclosure** trong extension UI, không chỉ privacy policy page. Cần thêm first-run screen khi user mở extension lần đầu.

## Context Links
- [Researcher report — mục 3](../reports/researcher-260330-2236-chrome-webstore-publishing.md)
- [Design tokens](../../../client/packages/ui/src/styles/design-tokens.ts)

## Why Required

> Google requires disclosure **before user grants permissions**, not buried in privacy policy.

Nếu thiếu → 35%+ chance bị reject vì "Privacy disclosure incomplete".

## Requirements

### Consent Screen Content

```
🔒 Privacy & Security

Vaultic stores your passwords locally on your device
using AES-256-GCM encryption.

• Your master password never leaves your device
• Vault data is encrypted before any sync
• No analytics, no tracking, no ads
• Cloud Sync is optional and off by default

By continuing, you agree to our Privacy Policy
and Terms of Service.

[Privacy Policy]  [Terms of Service]

          [Get Started →]
```

### Behavior

- Show **once** on first extension open (track via `chrome.storage.local` key `vaultic_consent_accepted`)
- After clicking "Get Started" → store flag → never show again
- "Privacy Policy" and "Terms of Service" links open in new tab
- Screen matches extension design system (Swiss Clean Minimal)
- No skip option — user must click "Get Started"

### Design Specs

- Full popup size (380x520)
- Shield/lock icon at top
- Text: Inter 400, 14px
- Links: primary blue `#2563EB`
- Button: primary blue, full-width, bottom
- Background: white `#FFFFFF`

## Related Code Files

- **Create:** `client/apps/extension/src/components/onboarding/consent-screen.tsx`
- **Modify:** `client/apps/extension/src/entrypoints/popup/app.tsx` — add consent gate
- **Reference:** `client/packages/ui/src/styles/design-tokens.ts` — use existing tokens

## Implementation Steps

1. Create `consent-screen.tsx` component
2. Add `vaultic_consent_accepted` storage check to app.tsx
3. If not accepted → show consent screen instead of normal UI
4. On "Get Started" click → set storage flag → show normal UI
5. Privacy Policy / Terms links → `chrome.tabs.create({ url: ... })`
6. Test: clear storage → verify consent shows → accept → verify normal UI

## Todo List

- [ ] Create consent-screen.tsx
- [ ] Add consent gate to app.tsx
- [ ] Test first-run flow
- [ ] Test repeated opens (should not show again)

## Success Criteria

- First open shows consent screen
- After accepting, never shows again
- Links work correctly
- Matches design system
