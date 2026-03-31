# Phase 1: Manifest & Icons Prep

## Status: `done`
## Priority: High
## Effort: 0.5 day

---

## Overview

Chuẩn bị manifest.json cho Chrome Web Store submission: thêm icons, version bump, và bổ sung metadata fields bắt buộc.

## Context Links
- [wxt.config.ts](../../../client/apps/extension/wxt.config.ts) — WXT config generates manifest
- [Generated manifest](../../../client/apps/extension/.output/chrome-mv3/manifest.json)

## Current State

Manifest thiếu:
- `icons` field (16, 32, 48, 128) — **không có file icon nào**
- `version` = 0.1.0 → cần bump lên 1.0.0 cho public release
- `homepage_url` — chưa khai báo

Host permissions: `<all_urls>` → giữ nguyên (đã quyết định ở brainstorm)

## Requirements

### Icon Files Needed

| Size | Usage | File |
|------|-------|------|
| 16x16 | Toolbar (favicon) | `src/assets/icons/icon-16.png` |
| 32x32 | Windows taskbar | `src/assets/icons/icon-32.png` |
| 48x48 | Extension management page | `src/assets/icons/icon-48.png` |
| 128x128 | Chrome Web Store listing (required) | `src/assets/icons/icon-128.png` |
| 192x192 | High-DPI displays (recommended) | `src/assets/icons/icon-192.png` |

Design: Vaultic logo — shield + lock, primary blue `#2563EB`, transparent background, clear at 16px.

### Manifest Updates in wxt.config.ts

```typescript
manifest: {
  name: 'Vaultic Password Manager',
  description: 'Open-source, zero-knowledge password manager with autofill',
  version: '1.0.0',
  icons: {
    '16': 'assets/icons/icon-16.png',
    '32': 'assets/icons/icon-32.png',
    '48': 'assets/icons/icon-48.png',
    '128': 'assets/icons/icon-128.png',
  },
  homepage_url: 'https://vaultic.inetdev.io.vn',
  permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'idle'],
  host_permissions: ['<all_urls>'],
  // ... rest unchanged
}
```

## Related Code Files

- **Modify:** `client/apps/extension/wxt.config.ts` — add icons, version, homepage_url
- **Create:** `client/apps/extension/src/assets/icons/icon-{16,32,48,128}.png`

## Implementation Steps

1. Design/generate icon set (16, 32, 48, 128px) — shield+lock, blue, transparent bg
2. Place PNGs in `client/apps/extension/src/assets/icons/`
3. Update `wxt.config.ts` manifest section: add `icons`, `homepage_url`, bump `version` to `1.0.0`
4. Run `pnpm build:production` → verify icons appear in `.output/chrome-mv3/`
5. Verify manifest.json has all fields

## Todo List

- [ ] Create icon set (16, 32, 48, 128px PNG)
- [ ] Update wxt.config.ts manifest
- [ ] Build & verify icons in output

## Success Criteria

- `pnpm build:production` produces manifest with `icons` field
- All 4 icon sizes present in build output
- 128x128 icon clear and recognizable
- `homepage_url` points to `https://vaultic.inetdev.io.vn`
