# Extension Auto-Update Mechanism (Sideload Only)

```yaml
status: done
priority: medium
effort: 1-2 days
branch: feat/extension-auto-update
blockedBy: [260330-2232-chrome-web-store-publish]
blocks: []
```

---

## Overview

Self-hosted auto-update **cho sideload users only** (cài từ .zip, không qua Chrome Web Store). CWS users được Chrome tự auto-update — plan này KHÔNG áp dụng cho họ.

Extension detect install type via `chrome.management.getSelf()`:
- `installType === "normal"` → CWS install → skip update checker entirely
- `installType === "development"` hoặc khác → sideload → enable update checker

Flow: poll server mỗi 6h → badge + banner khi có bản mới → user click download .zip + xem hướng dẫn cài đặt.

## Brainstorm Report
- [brainstorm-260330-2154-extension-update-mechanism.md](../reports/brainstorm-260330-2154-extension-update-mechanism.md)

## Dependencies
- blockedBy: [260330-2232-chrome-web-store-publish]
- blocks: none

## Scope Change (2026-03-31)
- **Original scope:** All users (self-hosted update for everyone)
- **New scope:** Sideload users only — CWS users get Chrome's native auto-update
- **Key addition:** `chrome.management.getSelf()` gating — skip all update logic for CWS installs
- **Permission addition:** `management` permission needed for install type detection
- **Impact:** All phases unchanged in structure, but Phase 2 adds install type check as first step

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Backend update API + static hosting | `done` | [phase-01](phase-01-backend-update-api.md) |
| 2 | Extension update checker service | `done` | [phase-02](phase-02-extension-update-checker.md) |
| 3 | Popup update banner UI | `done` | [phase-03](phase-03-popup-update-banner.md) |
| 4 | Update guide page + download flow | `done` | [phase-04](phase-04-update-guide-page.md) |
| 5 | Build script auto-zip + versioning | `done` | [phase-05](phase-05-build-script-zip.md) |

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
          poll mỗi 6h (sideload only)
                   │
┌──────────────────▼──────────────────────┐
│ Browser Extension (MV3)                 │
│                                         │
│  background.ts                          │
│  ├── chrome.management.getSelf()        │
│  │   ├── installType="normal" → SKIP    │
│  │   └── installType="development" → ↓  │
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

CWS users: Chrome auto-update → no banner, no polling
```

## Key Decisions
- **Sideload-only gating** — `chrome.management.getSelf()` check `installType`; skip for CWS installs
- **`management` permission** — cần thêm vào manifest cho install type detection
- **No auth** cho update endpoint — public, read-only
- **No database** — version info hardcoded hoặc đọc từ file JSON trên server
- **chrome.alarms** cho polling — đã có pattern trong sync-alarm-handler.ts
- **chrome.downloads** API để auto-download .zip
- **chrome.storage.local** lưu update state
- **Static HTML guide page** — WXT tab entrypoint, offline-ready
- **Semver compare** — đơn giản so sánh string (hoặc dùng lightweight semver util)
