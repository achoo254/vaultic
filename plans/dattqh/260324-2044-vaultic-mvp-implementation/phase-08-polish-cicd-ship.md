---
phase: 8
priority: high
status: pending
estimated_days: 4
depends_on: [6, 7]
---

# Phase 8: Polish, CI/CD & Ship

## Overview
Error handling, edge cases, CI/CD pipeline, Docker production build, Chrome Web Store submission, security review.

## Implementation Steps

### 1. Error handling & UI states (4h) — **Screens 20, 21**
- **Loading States (Screen 20)**:
  - Vault list skeleton (3 rows: circle + 2 line placeholders)
  - Sync progress: icon + "Syncing vault..." + progress bar + "12 of 47"
  - Button loading: disabled state with spinner icon + "Saving..."
- **Error States (Screen 21)**:
  - Network error: red bg card, wifi-off icon, "No Connection", Retry button
  - Wrong password: red border input + "Incorrect master password" error text
  - Inline validation: red border + alert icon + error message below field
  - Toast notification: dark bg bar, check icon + success/error message
- Network offline → show cached vault, queue changes for sync
- JWT expired → auto-refresh, re-auth if refresh fails
- Server down → graceful degradation with local cache

### 2. Settings screen (3h) — **Screen 19**
- Header: back arrow + "Settings"
- **Security section**: Auto-lock timeout (15 min default), Clear clipboard after (30s default)
- **Data section**: Export vault → Screen 23, Import passwords → Screen 24
- **Account section**: email display, Log out (red text)

### 3. Export Vault flow (2h) — **Screen 23**
- Download icon + description
- Format picker: Encrypted (.vaultic) selected by default, CSV (.csv) alternative
- Encryption password field (for .vaultic format)
- Export button
- Warning banner for CSV: "CSV exports are unencrypted. Handle with care."
- Export logic: decrypt all items → format → download blob

### 4. Import Passwords flow (2h) — **Screen 24**
- Upload icon + description
- Source picker: Google Chrome, 1Password, Bitwarden, CSV File
- File upload area: tap to select, supports .csv/.json/.1pux
- Import button (disabled until file selected)
- Parse logic: read file → detect format → map fields → encrypt → bulk API POST

### 5. Security Health screen (2h) — **Screen 10**
- Score circle (0-100%) with color coding
- Issue categories: Weak (red), Reused (yellow), Old (blue) — each with count + chevron
- Summary bar: Total/Strong/Medium/Weak counts
- Bottom nav with Health tab active
- Logic: iterate decrypted vault, score each password

### 6. UI Polish (3h)
- Dark mode (follow system preference)
- Responsive popup layout
- Keyboard navigation in popup
- Extension icon badge (locked/unlocked/error states)

### 7. CI/CD Pipeline — GitHub Actions (3h)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --workspace
      - run: cargo clippy --workspace -- -D warnings

  extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter extension build
      - uses: actions/upload-artifact@v4
        with:
          name: extension-chrome
          path: packages/extension/.output/chrome-mv3/
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: ghcr.io/vaultic/server:${{ github.ref_name }}

  extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install && pnpm --filter extension build
      # Chrome Web Store upload via chrome-webstore-upload-cli
```

### 8. Docker production config (2h)
- Finalize `docker-compose.prod.yml` with:
  - vaultic-server (from GHCR image)
  - PostgreSQL 16
  - nginx (reverse proxy + TLS via Let's Encrypt)
- Environment variables: DATABASE_URL, JWT_SECRET, CORS_ORIGIN
- Health checks for all services
- Volume backups documentation

### 9. Security review checklist (3h)
- [ ] No plaintext credentials in network requests (inspect all API calls)
- [ ] No plaintext in chrome.storage.local (only encrypted blobs)
- [ ] Encryption key only in chrome.storage.session
- [ ] Master password never stored/logged
- [ ] JWT tokens have proper expiry
- [ ] CORS configured correctly (only extension + share page origins)
- [ ] Rate limiting on auth endpoints
- [ ] SQL injection prevention (SeaORM parameterized queries)
- [ ] XSS prevention in share recipient page
- [ ] Content Security Policy in extension manifest
- [ ] No secrets in git history

### 10. Chrome Web Store submission (2h)
- Create developer account ($5 one-time fee)
- Prepare store listing: name, description, screenshots, icons
- Privacy policy page (required for password manager)
- Submit for review
- Also: Firefox Add-ons (AMO) submission

### 11. Landing page (2h)
- Simple static page explaining Vaultic
- Download/install links
- Open-source badge + GitHub link
- "Powered by" for share pages directs here

## Todo List
- [ ] Loading States patterns: skeleton, sync progress, button loading (Screen 20)
- [ ] Error States patterns: network, wrong password, validation, toast (Screen 21)
- [ ] Settings screen with security/data/account sections (Screen 19)
- [ ] Export Vault: format picker, password, download (Screen 23)
- [ ] Import Passwords: source picker, file upload, parse (Screen 24)
- [ ] Security Health: score circle, issue categories, summary (Screen 10)
- [ ] Dark mode support
- [ ] Extension icon badge states
- [ ] Keyboard navigation in popup
- [ ] GitHub Actions CI (Rust + Extension)
- [ ] GitHub Actions Release (Docker + Extension)
- [ ] Docker Compose production config
- [ ] Security review checklist (all items)
- [ ] Chrome Web Store listing + submission
- [ ] Firefox AMO submission
- [ ] Landing page (static)
- [ ] README.md with setup instructions
- [ ] LICENSE file (AGPL-3.0)

## Success Criteria
- CI passes on every PR (Rust tests + extension build)
- Release workflow builds Docker image + extension zip on tag
- Extension published to Chrome Web Store
- Docker Compose starts full stack on CentOS 7
- Security review: all checklist items pass
- No plaintext data in network or storage (verified)
- Landing page live with install links
