# Phase 6: Production Build & Submission

## Status: `pending`
## Priority: High (final phase)
## Effort: 0.5 day

---

## Overview

Build production extension, test locally, package zip, và submit lên Chrome Web Store.

## Prerequisites

- [ ] Phase 1 complete (icons + manifest)
- [ ] Phase 2 complete (privacy policy live)
- [ ] Phase 3 complete (store listing content ready)
- [ ] Phase 4 complete (screenshots ready)
- [ ] Developer account registered + identity verified

## Implementation Steps

### 1. Pre-build Checks

```bash
# Verify API URL points to production
# In client/apps/extension/.env.production:
# VITE_API_URL=https://vaultic.inetdev.io.vn/api
# VITE_SHARE_URL=https://vaultic.inetdev.io.vn/s

# Type check
cd client && pnpm tsc --noEmit

# Lint
pnpm lint
```

### 2. Production Build

```bash
cd client/apps/extension
pnpm build:production
```

### 3. Verify Build Output

Check `.output/chrome-mv3/`:
- [ ] `manifest.json` — version 1.0.0, icons present, all permissions
- [ ] `background.js` — service worker
- [ ] `popup.html` — popup UI
- [ ] `content-scripts/content.js` — autofill injector
- [ ] `assets/icons/` — 4 icon sizes
- [ ] No source maps in production build
- [ ] No `.env` files in output

### 4. Local Testing

1. Open `chrome://extensions/` → Enable Developer Mode
2. "Load unpacked" → select `.output/chrome-mv3/`
3. Test flows:
   - Create vault, add items
   - Autofill on a login page
   - Password generator
   - Share link creation
   - Settings page
4. Check console for errors
5. Verify CSP working (no violations)

### 5. Package Zip

```bash
cd client/apps/extension/.output
zip -r vaultic-1.0.0-chrome.zip chrome-mv3/
```

### 6. Submit to Chrome Web Store

1. Go to https://chrome.google.com/webstore/devconsole
2. Click "New Item" → Upload `vaultic-1.0.0-chrome.zip`
3. Fill store listing:
   - Description (EN + VI from Phase 3)
   - Category: Productivity
   - Language: English (default)
   - Additional language: Vietnamese
4. Upload screenshots (Phase 4)
5. Upload promotional images (Phase 4)
6. Privacy Policy URL: `https://vaultic.inetdev.io.vn/privacy-policy`
7. Fill Privacy Practices tab (Phase 3)
8. Fill permission justifications (Phase 3)
9. Set visibility: Public
10. Submit for review

## Post-Submission

- Monitor review status (expect 3-7 business days)
- If rejected: read feedback → fix → resubmit
- Common rejection fixes:
  - Permission justification needs more detail → expand with specific use cases
  - Privacy policy missing section → add missing section
  - Description too vague → be more specific about features
- After approved: update landing page with Chrome Web Store link

## Todo List

- [ ] Pre-build checks (env, tsc, lint)
- [ ] Production build
- [ ] Verify build output
- [ ] Local testing all flows
- [ ] Package zip
- [ ] Submit to Chrome Web Store
- [ ] Monitor review

## Success Criteria

- Production build compiles without errors
- All features work in local testing
- Zip uploaded successfully to Chrome Web Store
- All store listing fields filled
- Review submission accepted (no immediate rejection)
