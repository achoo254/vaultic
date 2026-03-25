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
- **Offline mode (normal operation)**: Vault fully functional from IndexedDB, sync indicator shows "Offline — changes will sync when connected"
- **Online → sync in progress**: Show subtle sync icon + "Syncing..." in header
- **Sync conflict**: Toast "Updated from another device" (LWW auto-resolved)
- JWT expired → auto-refresh when online, vault still works offline
- Server down → same as offline, no degradation since vault is local

### 2. Settings screen (4h) — **Screen 19**
- Header: back arrow + "Settings"
- **Security section**: Auto-lock timeout (15 min default), Clear clipboard after (30s default)
- **Cloud Sync section** (NEW):
  - Toggle: Enable Cloud Sync (default OFF)
  - Status text: "Local only" / "Synced 2 min ago" / "Syncing..."
  - "Sync Now" button (visible when ON)
  - Warning when toggling ON: "Your encrypted vault will be stored on the server. Only you can decrypt it."
  - When toggling OFF → dialog: "Delete cloud data?" with [Delete from server] (default) / [Keep on server]
  - First enable → full vault push (show progress)
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

### 7. CI/CD Pipeline — GitLab CI on gitlabs.inet.vn (3h)

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - release

rust-test:
  stage: test
  image: rust:1.77-bookworm
  script:
    - cargo test --workspace
    - cargo clippy --workspace -- -D warnings

extension-build:
  stage: build
  image: node:20-alpine
  before_script:
    - corepack enable && corepack prepare pnpm@latest --activate
    - pnpm install --frozen-lockfile
  script:
    - pnpm --filter extension build
  artifacts:
    paths:
      - packages/extension/.output/chrome-mv3/

docker-release:
  stage: release
  image: docker:latest
  services:
    - docker:dind
  only:
    - tags
  script:
    - docker build -f docker/Dockerfile -t gitlabs.inet.vn:5050/dattqh/vaultic/server:$CI_COMMIT_TAG .
    - docker push gitlabs.inet.vn:5050/dattqh/vaultic/server:$CI_COMMIT_TAG
```

### 8. Docker production config (2h)
- Finalize `docker-compose.prod.yml` with:
  - vaultic-server (from GitLab Container Registry image)
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
- Open-source badge + GitLab link
- "Powered by" for share pages directs here

## Design Verification Checklists

### Screen 10: Security Health
**Reference:** system-design.pen > Screen 10
- [ ] Score circle (0-100%) with color coding
- [ ] Issue categories: Weak (red), Reused (yellow), Old (blue)
- [ ] Summary bar: Total/Strong/Medium/Weak
- [ ] Bottom nav with Health tab active
- [ ] Screenshot comparison: ≥90% PASS

### Screen 19: Settings
**Reference:** system-design.pen > Screen 19
- [ ] Header: back arrow + "Settings"
- [ ] Security section: Auto-lock timeout, Clear clipboard
- [ ] Data section: Export vault, Import passwords
- [ ] Account section: email, Log out (red)
- [ ] Screenshot comparison: ≥90% PASS

### Screen 20: Loading States
**Reference:** system-design.pen > Screen 20
- [ ] Vault list skeleton (circle + 2 line placeholders)
- [ ] Sync progress: icon + text + progress bar
- [ ] Button loading: spinner + "Saving..."
- [ ] Screenshot comparison: ≥90% PASS

### Screen 21: Error States
**Reference:** system-design.pen > Screen 21
- [ ] Network error: red card, wifi-off icon, Retry button
- [ ] Wrong password: red border input + error text
- [ ] Inline validation: red border + alert icon
- [ ] Toast notification: dark bg + icon + message
- [ ] Screenshot comparison: ≥90% PASS

### Screen 23: Export Vault
**Reference:** system-design.pen > Screen 23
- [ ] Download icon + description
- [ ] Format picker: Encrypted (.vaultic) / CSV
- [ ] Password field for encrypted format
- [ ] Export button + CSV warning banner
- [ ] Screenshot comparison: ≥90% PASS

### Screen 24: Import Passwords
**Reference:** system-design.pen > Screen 24
- [ ] Upload icon + description
- [ ] Source picker: Chrome, 1Password, Bitwarden, CSV
- [ ] File upload area
- [ ] Import button
- [ ] Screenshot comparison: ≥90% PASS

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
- [ ] GitLab CI CI (Rust + Extension)
- [ ] GitLab CI Release (Docker + Extension)
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
