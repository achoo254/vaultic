# Brainstorm: VIUI Design System Migration

**Date:** 2026-03-30
**Scope:** Toàn bộ design system — colors, font, icons, radius
**Source:** https://viui.inet.vn (iNet VIUI Design System)
**Approach:** A — Token-First Migration (incremental)

---

## Problem Statement

Vaultic extension hiện dùng custom design tokens (Swiss Clean Minimal, blue/zinc). Vì app làm cho công ty iNet và sẽ publish lên GitHub, cần align với VIUI corporate design system để consistent branding.

---

## Quyết định đã thống nhất

| Decision | Choice |
|----------|--------|
| Approach | Token-First incremental (tokens → font → icons → design file → QA) |
| Accent color usage | CTA/highlights (buttons quan trọng, badges, active indicators) |
| Background | `#F4F7FA` (VIUI neutral-bg) — card surfaces white |
| Font | Nunito Sans (thay Inter) |
| Icons | @tabler/icons-react (thay lucide-react) |
| Spacing | Giữ nguyên (đã dùng 4/8px base) |

---

## Full Token Mapping

### Light Mode Colors

```typescript
export const lightColors = {
  primary: '#024799',       // VIUI --color-primary (was #2563EB)
  primaryHover: '#023A7A',  // Derived -10% lightness
  accent: '#CC0E0E',        // VIUI --color-accent (NEW)
  accentHover: '#A80B0B',   // Derived -10% lightness
  text: '#0F1E2D',          // VIUI --neutral-text (was #18181B)
  secondary: '#4A6278',     // VIUI --neutral-subtle (was #71717A)
  border: '#D0DAE6',        // VIUI --neutral-border (was #E4E4E7)
  background: '#F4F7FA',    // VIUI --neutral-bg (was #FFFFFF)
  surface: '#FFFFFF',       // Card surfaces (was #F4F4F5)
  error: '#B91C1C',         // VIUI --color-error (was #EF4444)
  success: '#0E9F6E',       // VIUI --color-success (was #22C55E)
  warning: '#D47B0A',       // VIUI --color-warning (was #F59E0B)
  info: '#8ABDEF',          // VIUI --color-info (NEW)
  // Badge semantic backgrounds
  badgeSuccessBg: '#ECFDF5', badgeSuccessText: '#065F46',
  badgeWarningBg: '#FFFBEB', badgeWarningText: '#92400E',
  badgeErrorBg: '#FEF2F2',  badgeErrorText: '#991B1B',
  badgeInfoBg: '#EFF6FF',   badgeInfoText: '#1E40AF',   // NEW
  // Semantic surface backgrounds
  warningBg: '#FFFBEB', warningText: '#92400E',
  successBg: '#ECFDF5', successText: '#065F46',
  primaryBg: '#EFF6FF',
};
```

### Dark Mode Colors

```typescript
export const darkColors = {
  primary: '#619EE9',       // VIUI dark --color-primary
  primaryHover: '#4F8AD6',
  accent: '#ED7B7B',        // VIUI dark --color-accent
  accentHover: '#E05A5A',
  text: '#E6EDF3',          // VIUI dark --neutral-text
  secondary: '#8B949E',     // VIUI dark --neutral-subtle
  border: '#21262D',        // VIUI dark --neutral-border
  background: '#0D1117',    // VIUI dark --neutral-bg
  surface: '#161B22',       // Dark card surface
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#619EE9',
  badgeSuccessBg: '#0A2A1F', badgeSuccessText: '#34D399',
  badgeWarningBg: '#2A1F06', badgeWarningText: '#FBBF24',
  badgeErrorBg: '#450A0A',  badgeErrorText: '#FECACA',
  badgeInfoBg: '#0A1628',   badgeInfoText: '#93C5FD',
  warningBg: '#2A1F06', warningText: '#FBBF24',
  successBg: '#0A2A1F', successText: '#34D399',
  primaryBg: '#0A1628',
};
```

### Typography

```typescript
font: {
  family: "'Nunito Sans', sans-serif",  // Was Inter
  size: { xs: 11, sm: 13, base: 14, lg: 16, xl: 18, xxl: 24 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
}
```

### Radius

```typescript
radius: { sm: 4, md: 8, lg: 12, full: 9999 }  // sm was 6
```

### Icons Migration

Library: `lucide-react` → `@tabler/icons-react`
Files affected: **26 component files**
Naming: Tabler uses `Icon` prefix (e.g., `Eye` → `IconEye`)

---

## Impact Analysis

| Area | Files | Risk |
|------|-------|------|
| `design-tokens.ts` | 1 | Low — single source of truth |
| Font loading (CSS) | 3 | Low — swap font name |
| Font loading (Google Fonts / local) | 1-2 | Low — add Nunito Sans |
| Icon imports | 26 | **Medium** — name mapping needed |
| Icon names | ~50+ unique icons | **Medium** — verify Tabler equivalents |
| `system-design.pen` | 1 | Medium — update design file |
| Hardcoded colors (if any) | Check | Low — tokens enforced |

---

## Migration Phases

| Phase | Task | Effort | Risk |
|-------|------|--------|------|
| 1 | Update `design-tokens.ts` (colors, font, radius) | 0.5d | Low |
| 2 | Swap font: Inter → Nunito Sans (CSS + loading) | 0.5d | Low |
| 3 | Icon migration: lucide → tabler (26 files) | 1-1.5d | Medium |
| 4 | Update `system-design.pen` design file | 0.5d | Low |
| 5 | Visual QA: screenshot compare all screens | 0.5d | Low |
| **Total** | | **~3 days** | |

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tabler icon không có equivalent cho một số Lucide icon | UI vỡ/thiếu icon | Build mapping table trước, fallback: custom SVG |
| Nunito Sans heavier than Inter → text overflow | Layout shift trong 380px popup | Test readability ở 14px base, adjust size nếu cần |
| Hardcoded colors missed | Inconsistent UI | Grep toàn bộ hex codes sau migration |
| Dark mode contrast issues | Accessibility | VIUI tokens đều AA compliant — risk thấp |

---

## Accent Color Usage

`accent: #CC0E0E` (light) / `#ED7B7B` (dark) dùng cho:
- **CTA buttons** quan trọng (e.g., "Save", "Share", "Generate")
- **Notification badges** (unread count, update available)
- **Active indicators** (selected tab, active folder)
- **NOT for:** danger/destructive actions (dùng `error` color thay)

---

## Success Criteria

- All UI components render đúng với VIUI tokens
- No hardcoded colors remain (grep verify)
- All 26 icon files migrated thành công
- Nunito Sans loads + renders correctly
- Dark mode contrast AA compliant
- No visual regressions vs design file

---

## Next Steps

Tạo implementation plan với `/ck:plan` để triển khai 5 phases.
