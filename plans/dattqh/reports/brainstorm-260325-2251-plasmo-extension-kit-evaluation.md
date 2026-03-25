# Brainstorm: Plasmo & Extension Template Kit Evaluation

**Date:** 2026-03-25  
**Status:** Concluded  
**Decision:** KHONG nen chuyen sang Plasmo. Co the xem xet them Radix primitives cho accessibility.

---

## 1. Van de

Vaultic dang dung WXT 0.19 + custom CSSProperties components. Cau hoi: co nen them Plasmo, template kit, hoac headless UI library?

## 2. Danh gia tung option

### 2.1 Plasmo vs WXT hien tai

| Tieu chi | WXT (hien tai) | Plasmo |
|----------|----------------|--------|
| Bundler | Vite (nhanh) | Parcel (cham 2-3x) |
| Bundle size | ~440 KB (thuc te) | ~800 KB (tuong duong) |
| HMR | Nhanh, ca background SW | Khong on dinh, hay phai reload tay |
| Framework | Agnostic (React, Vue, Svelte) | React-first |
| Multi-browser | Chrome, Firefox, Edge, Safari | Chrome, Firefox, Edge |
| Tinh trang bao tri | Active, community lon | Maintenance mode, it update |
| TailwindCSS v4 | Ho tro | Khong ho tro (Parcel lag) |
| File-based routing | Co | Co |

**Ket luan: KHONG chuyen sang Plasmo.**

Ly do:
- Plasmo dang o maintenance mode, it maintainer
- Parcel cham hon Vite 2-3x, bundle lon hon 43%
- WXT da cung cap moi thu Plasmo co: storage API, messaging, auto-publish
- Migration cost cao ma khong co loi ich gi moi
- Vaultic da build xong tren WXT, chay on dinh

### 2.2 Extension template kits (Extension.js, browser-extension-template)

| Kit | Gia tri them |
|-----|-------------|
| Extension.js | Zero-config nhung kem linh hoat hon WXT, khong mature |
| browser-extension-template | Boilerplate don gian, WXT da vuot xa |
| crxjs | Bi abandon, khong nen dung |

**Ket luan: KHONG can.**

Cac template kit nay giai quyet van de setup ban dau — Vaultic da qua giai doan do tu lau. WXT cung cap DX tot hon tat ca cac template kit.

### 2.3 Headless component libraries

| Library | Bundle (gzipped) | Components | Note |
|---------|------------------|------------|------|
| Radix Primitives | ~3-8 KB/component | 32+ primitives | Modular install, tree-shakeable |
| Headless UI | ~10 KB total | 10 components | Nhe nhung it component |
| Ark UI | ~5-10 KB/component | 30+ | Moi, it battle-tested |
| Base UI (MUI) | ~6 KB/component | Dang phat trien | Tu MUI team, con som |

**Phan tich chi tiet Radix:**

Uu diem:
- **Accessibility** built-in: keyboard nav, ARIA, focus management — day la thu Vaultic dang THIEU
- Modular: chi install component can dung (vd: `@radix-ui/react-dialog` ~8KB gzipped)
- Unstyled: khong conflict voi CSSProperties approach hien tai
- shadcn/ui dung Radix ben duoi — co the tham khao pattern

Nhuoc diem:
- Them dependency vao bundle (~20-40 KB cho 3-5 primitives)
- node_modules tang do cross-package dependencies
- Can wrapper de map voi design tokens

### 2.4 Hien trang custom approach

**Diem manh:**
- Bundle cuc nhe (~440 KB total)
- Full control, khong dependency ngoai
- Design tokens nhat quan
- 14 shared components + 22 extension components = du cho MVP

**Diem yeu (quan trong):**
- **Modal**: thieu focus trap, thieu aria-describedby, click overlay close nhung khong co focus management
- **Select**: dung native `<select>` — khong style duoc dropdown, UX kem tren extension popup
- **Khong co**: Tooltip, Popover, Dropdown Menu, Tabs — cac component nay can accessibility phuc tap
- Keyboard navigation chua day du
- Screen reader support chua duoc test

## 3. De xuat cuoi cung

### Tier 1: KHONG lam (YAGNI)
- **Khong chuyen sang Plasmo** — waste of effort, framework dang di xuong
- **Khong dung template kit** — da co WXT, khong can boilerplate
- **Khong dung Tailwind** — CSSProperties approach dang lam tot, them Tailwind = migration cost lon

### Tier 2: NEN lam (khi can)
- **Them Radix primitives cho cac complex components** — chi khi can build:
  - `@radix-ui/react-dialog` — thay the Modal hien tai (focus trap, portal, aria)
  - `@radix-ui/react-dropdown-menu` — cho context menu tren vault items
  - `@radix-ui/react-tooltip` — cho icon buttons, copy feedback
  - `@radix-ui/react-tabs` — neu can tabbed views

- **Cach tich hop**: Tao wrapper components trong `@vaultic/ui` dung Radix ben duoi + apply design tokens qua CSSProperties. Extension components khong biet la dang dung Radix.

- **Bundle impact**: ~25-35 KB them (gzipped) cho 3-4 primitives → total ~475 KB. Chap nhan duoc.

### Tier 3: KHONG nen lam (over-engineering)
- Dung full shadcn/ui (can Tailwind, migration lon)
- Dung Ark UI (chua du stable)
- Build custom accessibility primitives tu dau (reinvent wheel)

## 4. Tong ket

| Quyet dinh | Hanh dong | Ly do |
|------------|-----------|-------|
| Plasmo | SKIP | Maintenance mode, bundle lon, WXT tot hon |
| Template kits | SKIP | Da co WXT, khong can |
| Radix primitives | XEM XET khi can complex UI | Accessibility, focus mgmt, modular |
| Custom approach | GIU NGUYEN lam core | Nhe, nhanh, du cho MVP |

**Bottom line:** Stack hien tai (WXT + custom CSSProperties) la dung dan cho MVP. Dieu duy nhat dang xem xet la them Radix primitives cho Dialog/Dropdown/Tooltip khi accessibility tro thanh priority — nhung do la enhancement, khong phai urgency.

## 5. Risk Assessment

- **Risk thap**: Giu nguyen custom approach cho MVP, accessibility chua la blocker
- **Risk trung binh**: Neu co user report accessibility issues, can them Radix nhanh
- **Risk cao**: Neu chuyen sang Plasmo — waste 1-2 tuan, khong loi ich

## Sources

- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [Chrome Extension Framework Comparison 2025](https://www.devkit.best/blog/mdx/chrome-extension-framework-comparison-2025)
- [WXT vs Plasmo - Kite Metric](https://kitemetric.com/blogs/how-to-choose-the-best-browser-extension-framework)
- [Migrating from Plasmo to WXT - Jetwriter](https://jetwriter.ai/blog/migrate-plasmo-to-wxt)
- [WXT Official Comparison](https://wxt.dev/guide/resources/compare)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Headless UI vs Radix 2025](https://www.subframe.com/tips/headless-ui-vs-radix)
- [shadcn/ui vs Base UI vs Radix 2026](https://www.pkgpulse.com/blog/shadcn-ui-vs-base-ui-vs-radix-components-2026)
- [Plasmo Roadmap Discussion](https://github.com/PlasmoHQ/plasmo/discussions/857)
- [Top 5 Extension Frameworks 2026](https://extensionbooster.com/blog/best-chrome-extension-frameworks-compared/)

## Unresolved Questions

1. Vaultic co ke hoach submit len Chrome Web Store khong? Neu co, accessibility la requirement bat buoc.
2. Co plan cho desktop app (Tauri/Electron) khong? Neu co, Radix primitives se reusable cross-platform.
3. Priority cua accessibility so voi cac features khac trong roadmap?
