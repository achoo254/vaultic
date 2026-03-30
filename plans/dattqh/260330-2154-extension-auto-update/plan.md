# Extension Auto-Update Mechanism

## Status: `ready`
## Priority: Medium
## Effort: 1-2 days
## Branch: `feat/extension-auto-update`

---

## Overview

Self-hosted auto-update cho Vaultic browser extension. Extension poll server check version mỗi 6h → badge + banner khi có bản mới → user click download .zip + xem hướng dẫn cài đặt.

Không thể silent auto-update ngoài Chrome Web Store (MV3 restriction) → best UX = notify + auto-download + guided reload.

## Brainstorm Report
- [brainstorm-260330-2154-extension-update-mechanism.md](../reports/brainstorm-260330-2154-extension-update-mechanism.md)

## Dependencies
- blockedBy: [260330-2232-chrome-web-store-publish]
- blocks: none

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Backend update API + static hosting | `pending` | [phase-01](phase-01-backend-update-api.md) |
| 2 | Extension update checker service | `pending` | [phase-02](phase-02-extension-update-checker.md) |
| 3 | Popup update banner UI | `pending` | [phase-03](phase-03-popup-update-banner.md) |
| 4 | Update guide page + download flow | `pending` | [phase-04](phase-04-update-guide-page.md) |
| 5 | Build script auto-zip + versioning | `pending` | [phase-05](phase-05-build-script-zip.md) |

## Architecture

```
┌─────────────────────────────────────────┐
│ VPS (CentOS 7)                          │
│                                         │
│  nginx                                  │
│  ├── /static/releases/*.zip             │
│  └── proxy → Express                    │
│                                         │
│  Express Backend                        │
│  └── GET /api/v1/extension/latest       │
│      → { version, downloadUrl, notes }  │
└──────────────────┬──────────────────────┘
                   │
          poll mỗi 6h
                   │
┌──────────────────▼──────────────────────┐
│ Browser Extension (MV3)                 │
│                                         │
│  background.ts                          │
│  ├── chrome.alarms "check-update" (6h)  │
│  ├── fetch /api/v1/extension/latest     │
│  ├── compare semver                     │
│  └── set badge + store update state     │
│                                         │
│  popup (app.tsx)                        │
│  ├── read update state from storage     │
│  ├── show banner "Update v0.2.0"        │
│  └── click → download .zip + open guide │
│                                         │
│  guide page (update-guide.html)         │
│  └── 3 steps: extract → replace → reload│
└─────────────────────────────────────────┘
```

## Key Decisions
- **No auth** cho update endpoint — public, read-only
- **No database** — version info hardcoded hoặc đọc từ file JSON trên server
- **chrome.alarms** cho polling — đã có pattern trong sync-alarm-handler.ts
- **chrome.downloads** API để auto-download .zip
- **chrome.storage.local** lưu update state
- **Static HTML guide page** — WXT tab entrypoint, offline-ready
- **Semver compare** — đơn giản so sánh string (hoặc dùng lightweight semver util)
