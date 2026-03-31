# Phase 4: Visual Assets (Screenshots + Promotional)

## Status: `partial`
## Priority: High (screenshots blocker, promotional nice-to-have)
## Effort: 1-2 days

---

## Overview

Tạo screenshots và promotional images cho Chrome Web Store listing. Screenshots là bắt buộc (min 1, target 5). Promotional images optional nhưng tăng visibility.

## Requirements

### Screenshots (1280x800 px, PNG/JPEG)

Cần build production → load extension → chụp thực tế.

| # | Screen | Content | Notes |
|---|--------|---------|-------|
| 1 | Vault list | Main popup showing vault items + search bar | Primary screenshot, shows core UX |
| 2 | Password generator | Password generator view with options | Shows utility feature |
| 3 | Autofill demo | Extension filling a login form on a website | Shows real-world usage |
| 4 | Security health | Security health dashboard in settings | Shows security focus |
| 5 | Share link | Encrypted share link creation | Shows unique feature |

**Guidelines:**
- Chụp từ extension popup thực tế (380x520) → đặt trên background 1280x800
- Thêm brief caption/annotation trên mỗi screenshot
- Dùng clean background (white hoặc light gray)
- Không dùng fake data — tạo realistic demo vault items
- Design style: Swiss Clean Minimal, match extension UI

### Promotional Tile (440x280 px)

- Vaultic logo + tagline "Zero-Knowledge Password Manager"
- Blue `#2563EB` accent
- Clean, minimal design

### Marquee Banner (1400x560 px)

- Hero-style: logo + key features + CTA
- "Open Source • Zero Knowledge • Privacy First"
- Suitable for Chrome Web Store featured section

## Implementation Steps

1. Build production extension: `pnpm build:production`
2. Load unpacked extension in Chrome
3. Create demo vault data (realistic entries: Google, GitHub, Netflix, etc.)
4. Screenshot each screen at proper dimensions
5. Composite screenshots onto 1280x800 canvases with annotations
6. Design promotional tile 440x280
7. Design marquee banner 1400x560
8. Save all assets in `client/apps/extension/store-assets/`

## Related Code Files

- **Create:** `client/apps/extension/store-assets/` directory
- **Create:** Screenshots and promotional images in above directory

## Todo List

- [ ] Build production extension
- [ ] Create demo vault data
- [ ] Capture 5 screenshots
- [ ] Annotate screenshots on 1280x800 canvases
- [ ] Design 440x280 promotional tile
- [ ] Design 1400x560 marquee banner
- [ ] Verify all dimensions correct

## Success Criteria

- 5 screenshots at exactly 1280x800
- Screenshots show real extension UI, not mockups
- Promotional tile and marquee are professional quality
- All images under 1MB each (PNG optimized)
