# Phase 2: Extension Update Checker Service (Sideload Only)

## Status: `done`
## Priority: High
## Effort: 2-3 hours

## Overview
Background service worker alarm poll server mỗi 6h, so sánh version, lưu update state vào chrome.storage.local, set badge. **Chỉ chạy cho sideload installs** — CWS users skip entirely.

## Context
- Existing alarm pattern: `client/apps/extension/src/entrypoints/background/sync-alarm-handler.ts`
- Background entrypoint: `client/apps/extension/src/entrypoints/background.ts`
- Message router đã có trong background.ts
- Alarms permission đã có trong wxt.config.ts

## Related Code Files

### Create
- `client/apps/extension/src/entrypoints/background/update-checker-handler.ts` — alarm handler + version check logic
- `client/apps/extension/src/lib/update-checker.ts` — shared update state types + helpers

### Modify
- `client/apps/extension/src/entrypoints/background.ts` — register alarm + message handler
- `client/apps/extension/wxt.config.ts` — thêm `downloads` permission

## Implementation Steps

### 0. Install type detection (GATE — chạy trước mọi thứ)
```typescript
// Trong setupUpdateAlarm() hoặc background.ts init:
async function isSideloadInstall(): Promise<boolean> {
  const self = await chrome.management.getSelf();
  // "normal" = CWS, "development" = unpacked/sideload
  return self.installType !== 'normal';
}

// Trong init:
const sideload = await isSideloadInstall();
if (!sideload) {
  // CWS install → Chrome handles auto-update → skip entirely
  return;
}
// Proceed with alarm setup...
```

### 1. Thêm `downloads` + `management` permissions
```typescript
// wxt.config.ts
permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'idle', 'downloads', 'management'],
```

### 2. Tạo update state types (`lib/update-checker.ts`)
```typescript
export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  releasedAt: string;
}

export interface UpdateState {
  available: boolean;
  info: UpdateInfo | null;
  lastChecked: number; // timestamp
  dismissed: boolean;
}

export const UPDATE_STORAGE_KEY = 'vaultic_update_state';
export const UPDATE_ALARM_NAME = 'check-extension-update';
export const UPDATE_CHECK_INTERVAL_MINUTES = 360; // 6 hours
```

### 3. Tạo update checker handler
```typescript
// update-checker-handler.ts
// - fetchLatestVersion() → GET /api/v1/extension/latest
// - compareVersions(current, latest) → boolean (simple semver)
// - handleUpdateAlarm() → fetch, compare, update storage, set badge
// - setupUpdateAlarm() → chrome.alarms.create
```

**Version compare logic:**
```typescript
// Simple: split by ".", compare major.minor.patch numerically
function isNewerVersion(current: string, latest: string): boolean {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}
```

### 4. Register trong background.ts
```typescript
// Thêm alarm listener cho 'check-extension-update'
// Thêm message type 'CHECK_UPDATE' cho manual trigger từ popup
// Thêm message type 'GET_UPDATE_STATE' để popup đọc state
// Thêm message type 'DISMISS_UPDATE' để user tắt banner
```

### 5. Badge handling
```typescript
// Khi có update: chrome.action.setBadgeText({ text: '!' })
// Khi dismiss/update: chrome.action.setBadgeText({ text: '' })
// Badge color: đỏ (#EF4444)
```

## Todo
- [x] Thêm `downloads` + `management` permissions vào wxt.config.ts
- [x] Tạo `lib/update-checker.ts` — types + helpers + `isSideloadInstall()`
- [x] Tạo `background/update-checker-handler.ts` — alarm handler (gated by install type)
- [x] Register alarm + message handlers trong background.ts
- [x] Test: CWS install → update checker NOT initialized
- [x] Test: sideload install → alarm fires → fetch → compare → badge set
- [x] Test: graceful failure khi server unreachable

## Success Criteria
- Alarm `check-extension-update` chạy mỗi 6h
- Khi có version mới → badge "!" đỏ trên icon
- Update state lưu trong chrome.storage.local
- Graceful fallback khi server down (no error, retry next cycle)
- Manual check từ popup qua message `CHECK_UPDATE`

## Security
- Chỉ fetch từ API_URL đã cấu hình (env variable)
- Không execute code từ server — chỉ đọc JSON metadata
- Validate response schema trước khi lưu
