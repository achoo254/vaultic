# Brainstorm: Extension Update Mechanism

## Problem
Vaultic extension chưa publish lên Chrome Web Store → cần cơ chế update tiện lợi nhất cho user khi self-host trên VPS.

## Constraints
- Chrome MV3 block sideloaded .crx trên Windows/Mac (trừ enterprise policy)
- Load unpacked không hỗ trợ auto-update
- Extension không thể tự ghi đè code của mình (MV3 sandbox)
- Host: self-hosted VPS (CentOS 7)
- Build output: `.output/chrome-mv3/` (~994kB)

## Approaches Evaluated

### A) Notify + Auto-Download + Guided Reload ✅ CHOSEN
- Background script poll server mỗi 6h check version
- Badge đỏ + notification khi có bản mới
- User click → auto-download .zip + mở tab hướng dẫn step-by-step
- **User effort:** ~3 bước (download → giải nén đè → reload extension)
- **Complexity:** Thấp — 1 API endpoint + static file hosting
- **Pros:** Simple, reliable, no extra dependencies
- **Cons:** User vẫn cần thao tác thủ công giải nén + reload

### B) Self-replace code ❌ REJECTED
- Extension tự download + ghi đè code → prompt reload
- **Không khả thi** — MV3 service worker không có quyền ghi vào extension directory

### C) Native host wrapper ❌ REJECTED
- Cài native app (Electron/Tauri) để auto-replace extension folder
- **Overkill** cho giai đoạn hiện tại, thêm maintenance burden

## Recommended Solution: Approach A

### Components

**Server-side:**
- `GET /api/extension/latest` → `{ version, downloadUrl, changelog, minVersion? }`
- Static file: `/static/releases/vaultic-ext-v{version}.zip`
- Build script: auto-zip `.output/chrome-mv3/` với version từ package.json

**Extension-side:**
- Update checker service trong background script (alarm mỗi 6h)
- Badge "!" đỏ trên extension icon khi có update
- Popup hiện banner "Update available v0.2.0"
- Click → auto-download .zip + mở guide tab
- Guide tab: HTML page có step-by-step ảnh minh họa

**Build pipeline:**
- Script zip output → tên file có version
- Upload .zip lên VPS static folder
- Bump version trong API endpoint

### UX Flow
```
Extension start/alarm
  → GET /api/extension/latest
  → Compare semver với current version
  → Nếu mới hơn:
      → Set badge text "1"
      → Show notification (optional)
      → Popup hiện update banner
  → User click "Update now"
      → chrome.downloads.download(zipUrl)
      → chrome.tabs.create(guidePageUrl)
      → Guide page hiện 3 bước: giải nén → đè thư mục → reload
```

### Implementation Considerations
- Cache version check để không spam server
- Graceful fallback nếu server unreachable
- Changelog ngắn gọn để user biết bản mới có gì
- Guide page là static HTML trong extension (offline-ready)
- Version comparison dùng semver

### Risk Assessment
- **Low:** Server down → extension vẫn hoạt động bình thường, chỉ không check được update
- **Low:** User bỏ qua update → extension cũ vẫn chạy, remind lại lần sau
- **Medium:** User giải nén sai thư mục → guide page cần rõ ràng với ảnh minh họa

### Success Metrics
- User nhận được notification update trong vòng 6h sau khi release
- Download + install bản mới < 2 phút thao tác
- Zero downtime cho extension hiện tại trong quá trình update

## Next Steps
- Tạo plan chi tiết implement nếu user đồng ý
