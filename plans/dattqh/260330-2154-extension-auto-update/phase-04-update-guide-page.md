# Phase 4: Update Guide Page + Download Flow

## Status: `done`
## Priority: Medium
## Effort: 1-2 hours

## Overview
WXT tab entrypoint — static HTML page hướng dẫn user cài bản mới với 3 bước rõ ràng. Mở khi user click "Update" trong popup.

## Context
- WXT hỗ trợ custom tab entrypoints: `src/entrypoints/*.html` hoặc dùng `defineUnlistedScript`
- Existing entrypoints: popup/, background.ts, content.ts
- Design tokens available qua `@vaultic/ui`

## Related Code Files

### Create
- `client/apps/extension/src/entrypoints/update-guide.html` — HTML entry
- `client/apps/extension/src/entrypoints/update-guide/main.tsx` — React mount
- `client/apps/extension/src/entrypoints/update-guide/app.tsx` — Guide page component

## Implementation Steps

### 1. Tạo WXT tab entrypoint
WXT convention cho unlisted pages:
```
src/entrypoints/update-guide.html  → chrome-extension://id/update-guide.html
src/entrypoints/update-guide/main.tsx
src/entrypoints/update-guide/app.tsx
```

### 2. Guide page content
3 bước chính với icon + mô tả:

```
Step 1: Extract
  "Giải nén file .zip vừa tải về"
  [Icon: folder-open]

Step 2: Replace
  "Mở chrome://extensions → tìm Vaultic → click 'Load unpacked'
   → chọn thư mục vừa giải nén (đè thư mục cũ)"
  [Icon: replace]

Step 3: Reload
  "Click nút reload (↻) trên extension card trong chrome://extensions"
  [Icon: refresh-cw]
```

### 3. Dynamic version info
- Đọc update state từ `chrome.storage.local`
- Hiện: version mới, release notes, download link (backup nếu auto-download fail)
- Nút "Download again" fallback

### 4. Styling
- Full-width tab page (không giới hạn 380x520 như popup)
- Clean, centered layout — max-width 600px
- Dùng design tokens cho colors/fonts
- Lucide icons cho visual cues
- Responsive cho các kích thước tab khác nhau

## Todo
- [x] Tạo WXT tab entrypoint (html + main.tsx + app.tsx)
- [x] Implement 3-step guide layout
- [x] Đọc dynamic version info từ storage
- [x] Fallback download button
- [x] Style với design tokens
- [x] Test: page mở đúng từ popup click
- [x] Test: hiện đúng version info

## Success Criteria
- Page mở đúng URL `chrome-extension://id/update-guide.html`
- 3 bước rõ ràng, dễ hiểu cho non-technical user
- Version + release notes hiện dynamic
- Fallback download button hoạt động
- Design nhất quán với Vaultic branding
