# Phase 5: Visual QA + Design File Update

## Status: `pending`
## Priority: Medium
## Effort: 0.5 day

---

## Overview

Final verification: screenshot every screen, compare against VIUI design system, update `system-design.pen` if needed.

## QA Checklist

### Screens to Verify

| Screen | Key Checks |
|--------|-----------|
| Lock screen | Primary blue correct, Nunito Sans font, Tabler lock icon |
| Login form | Eye/EyeOff icons, button colors, input borders |
| Register form | Same as login + accent CTA if applicable |
| Setup password | Same as login |
| Vault list (empty) | Background #F4F7FA, surface #FFFFFF, icons correct |
| Vault list (with items) | Card styling, folder icons, search bar |
| Vault item detail | Back arrow, edit/delete icons, field styling |
| Vault item form | Sparkles icon, refresh icon, form fields |
| Password generator | Refresh icon, slider styling |
| Search bar | Search/X icons, input styling |
| Folder management | Folder icons, trash, plus |
| Settings page | All 12+ icons correct, theme toggle, sync |
| Security health | Shield alert, chevron right, timer |
| Share page | Globe, back arrow |
| Share options | Alert triangle warning |
| Share link result | Circle check, copy, clock, eye |
| Enable sync modal | Cloud, shield check |
| Disable sync modal | Cloud off, trash, pause |
| Import passwords | Upload icon |
| Export vault | Download, alert triangle |
| Bottom nav | Dice, grid, share, shield |
| App header | Shield check, wifi off |
| Autofill dropdown (content) | VIUI colors, correct font |
| Save banner (content) | VIUI primary, correct font |

### Color Verification

- [ ] Primary blue matches `#024799` (light) / `#619EE9` (dark)
- [ ] Background is `#F4F7FA` not white
- [ ] Card surfaces are `#FFFFFF`
- [ ] Borders are `#D0DAE6`
- [ ] Text is `#0F1E2D`
- [ ] Error states use `#B91C1C`
- [ ] Success states use `#0E9F6E`

### Font Verification

- [ ] All text renders in Nunito Sans
- [ ] No text overflow in 380px popup
- [ ] Weights (400, 500, 600, 700) all load correctly

### Icon Verification

- [ ] All icons render (no missing/broken)
- [ ] Consistent stroke width
- [ ] Correct sizing (16, 20, 24)

## Design File Update

If `system-design.pen` references old colors/fonts, update via Pencil MCP tools:
- Update color palette nodes
- Update font family references
- Update any static text showing old branding

## Implementation Steps

1. Build production: `pnpm build:production`
2. Load extension in Chrome
3. Screenshot each screen (light + dark mode)
4. Compare against VIUI token values
5. Fix any visual regressions found
6. Update `system-design.pen` if needed

## Todo List

- [ ] Screenshot all screens (light mode)
- [ ] Screenshot all screens (dark mode)
- [ ] Verify colors match VIUI
- [ ] Verify font is Nunito Sans
- [ ] Verify all icons render
- [ ] Fix regressions
- [ ] Update system-design.pen

## Success Criteria

- All screens match VIUI design system
- No visual regressions
- Font, colors, icons all consistent
- Design file updated
