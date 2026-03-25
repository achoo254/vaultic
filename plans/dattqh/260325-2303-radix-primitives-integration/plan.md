---
status: pending
priority: medium
estimated_effort: 4h
---

# Radix Primitives Integration — @vaultic/ui Accessibility

## Problem
Current interactive components lack proper accessibility:
- **Modal**: No focus trap, no return-focus, no scroll lock
- **Select**: Native `<select>` — unstylable dropdown, inconsistent cross-browser
- **BottomNav/ToggleGroup**: No keyboard navigation (arrow keys)
- **Tooltip**: Doesn't exist yet — needed for icon buttons

Chrome Web Store requires WCAG 2.1 AA. Current implementation fails keyboard-only and screen reader testing.

## Goal
Replace 3 existing components + add 1 new with Radix primitives. Keep same visual design (CSSProperties + tokens). Budget: ≤30KB bundle increase.

## Approach
Radix provides **unstyled, accessible primitives**. We wrap them with our design tokens in `@vaultic/ui`. External API stays identical — extension code changes are minimal (import paths don't change).

## Radix Packages Needed
| Package | Size (gzip) | Replaces |
|---------|-------------|----------|
| `@radix-ui/react-dialog` | ~8 KB | `modal.tsx` |
| `@radix-ui/react-select` | ~12 KB | `select.tsx` |
| `@radix-ui/react-tooltip` | ~6 KB | (new) |
| `@radix-ui/react-tabs` | ~4 KB | ToggleGroup nav pattern |
| **Total** | **~30 KB** | |

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Install & upgrade Modal → Dialog](phase-01-modal-dialog.md) | 1h | pending |
| 2 | [Upgrade Select → Radix Select](phase-02-select-upgrade.md) | 1.5h | pending |
| 3 | [Add Tooltip component](phase-03-tooltip.md) | 0.5h | pending |
| 4 | [Update extension consumers + verify](phase-04-extension-integration.md) | 1h | pending |

## Dependencies
- `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`
- React 19 compatibility (Radix supports React 19 since v1.1+)

## Constraints
- Keep TypeScript CSSProperties approach — Radix is unstyled so this works
- All styling via design tokens only
- ModalProps / SelectProps API must remain backward-compatible
- Extension build must stay under 470 KB (current: 440 KB)
- No Radix Tabs — BottomNav/ToggleGroup patterns are simple enough without it

## Why NOT Radix Tabs
BottomNav is a nav bar (semantic `<nav>`), not a tab panel. ToggleGroup already works with `role="radiogroup"`. Adding Radix Tabs would force a content-panel pattern that doesn't match our routing-based architecture. Skip.

## Success Criteria
- Modal: focus trapped, return-focus on close, scroll lock, Escape closes
- Select: fully stylable dropdown, keyboard navigable, screen reader announced
- Tooltip: shows on hover/focus, proper aria-describedby
- All existing tests/build pass
- Bundle ≤ 470 KB
- No visual regression
