# Phase 3: Popup Update Banner UI

## Status: `done`
## Priority: Medium
## Effort: 1-2 hours

## Overview
Banner trong popup hiện khi có bản mới. Hiện version mới + release notes ngắn + nút "Update Now".

## Context
- Popup root: `client/apps/extension/src/entrypoints/popup/app.tsx`
- AppShell component chứa header + content + bottom nav
- Toast system có sẵn: `src/components/common/toast.tsx`
- Design tokens: `@vaultic/ui` — dùng tokens cho colors/spacing
- Extension size: 380x520px

## Related Code Files

### Create
- `client/apps/extension/src/components/common/update-banner.tsx` — banner component

### Modify
- `client/apps/extension/src/entrypoints/popup/app.tsx` — thêm update state + render banner

## Implementation Steps

### 1. Tạo update-banner.tsx
```tsx
// Props: version, releaseNotes, onUpdate, onDismiss
// Layout: horizontal bar, blue background (primary color)
// Content: "v0.2.0 available" + "Update" button + "×" dismiss
// Compact: 1 dòng, fit trong 380px width
// Use design tokens for colors
```

**Visual mockup:**
```
┌──────────────────────────────────────┐
│ 🔵 v0.2.0 available   [Update] [×]  │
└──────────────────────────────────────┘
```

### 2. Integrate vào app.tsx
```tsx
// Đọc update state từ chrome.storage.local on mount
// Listen storage changes cho real-time update
// Render <UpdateBanner /> phía trên main content, dưới header
// onUpdate → trigger download + open guide tab
// onDismiss → set dismissed=true trong storage
```

### 3. Update flow khi user click "Update"
```typescript
// 1. chrome.downloads.download({ url: downloadUrl })
// 2. chrome.tabs.create({ url: chrome.runtime.getURL('update-guide.html') })
// 3. window.close() — đóng popup
```

### 4. Dismiss logic
- User click "×" → dismissed=true cho version hiện tại
- Khi có version MỚI hơn (khác version đã dismiss) → hiện lại banner
- Storage key: `vaultic_update_state.dismissed` + `vaultic_update_state.dismissedVersion`

## Todo
- [x] Tạo `update-banner.tsx` component
- [x] Integrate vào `app.tsx` với storage listener
- [x] Handle "Update" click → download + guide tab
- [x] Handle "Dismiss" click → lưu state
- [x] Test: banner hiện đúng khi có update
- [x] Test: banner ẩn khi dismiss, hiện lại khi version mới hơn

## Success Criteria
- Banner hiện ngay khi mở popup nếu có update
- Click "Update" → .zip tự download + guide tab mở
- Click dismiss → banner ẩn, chỉ hiện lại khi có version mới khác
- Design consistent với Vaultic design tokens
- Không chiếm quá nhiều space (max 40px height)
