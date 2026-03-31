# Phase 4: Hardcoded Colors Cleanup

## Status: `done`
## Priority: High
## Effort: 0.5 day

---

## Overview

Content scripts (`autofill-dropdown-styles.ts`, `autofill-icon.ts`, `save-banner.ts`) have ~40 hardcoded hex colors that bypass design tokens. Replace all with VIUI equivalents.

## Known Hardcoded Colors

### autofill-dropdown-styles.ts (Light Mode)

| Old Hex | Token | VIUI Replacement |
|---------|-------|-----------------|
| `#2563EB` | primary | `#024799` |
| `#1D4ED8` | primaryHover | `#023A7A` |
| `#F4F4F5` | surface (old) | `#FFFFFF` |
| `#EFF6FF` | primaryBg | `#EFF6FF` (same) |
| `#DBEAFE` | primaryBg hover | `#DBEAFE` → `#D6E8FF` |
| `#18181B` | text | `#0F1E2D` |
| `#71717A` | secondary | `#4A6278` |
| `#E4E4E7` | border | `#D0DAE6` |
| `#A1A1AA` | secondary (dark variant) | `#8B949E` |
| `#FAFAFA` | surface light | `#F4F7FA` |
| `#EF4444` | error | `#B91C1C` |

### autofill-dropdown-styles.ts (Dark Mode)

| Old Hex | Token | VIUI Replacement |
|---------|-------|-----------------|
| `#18181B` | background (dark) | `#0D1117` |
| `#27272A` | surface (dark) | `#161B22` |
| `#1E3A5F` | primaryBg (dark) | `#0A1628` |
| `#FAFAFA` | text (dark) | `#E6EDF3` |
| `#A1A1AA` | secondary (dark) | `#8B949E` |
| `#3F3F46` | border hover (dark) | `#30363D` |
| `#71717A` | placeholder (dark) | `#484F58` |

### autofill-icon.ts

| Old Hex | VIUI Replacement |
|---------|-----------------|
| `#2563EB` | `#024799` |
| `#F4F4F5` | `#F4F7FA` |
| `#71717A` | `#4A6278` |

### save-banner.ts

| Old Hex | VIUI Replacement |
|---------|-----------------|
| `#18181B` | `#0F1E2D` |
| `#71717A` | `#4A6278` |
| `#2563EB` | `#024799` |

### styles.css

| Old Hex | VIUI Replacement |
|---------|-----------------|
| `#A1A1AA` (placeholder) | `#8B949E` |
| `#D4D4D8` (scrollbar) | `#D0DAE6` |

### SVG Inline Colors

`SHIELD_SVG` stroke: `#2563EB` → `#024799`
`CLOSE_SVG` stroke: `#A1A1AA` → `#8B949E`

## Related Code Files

- **Modify:** `client/apps/extension/src/content/autofill-dropdown-styles.ts`
- **Modify:** `client/apps/extension/src/content/autofill-icon.ts`
- **Modify:** `client/apps/extension/src/content/save-banner.ts`
- **Modify:** `client/apps/extension/src/assets/styles.css`

## Implementation Steps

1. Replace all hex codes in `autofill-dropdown-styles.ts` per mapping tables
2. Replace hex codes in `autofill-icon.ts`
3. Replace hex codes in `save-banner.ts`
4. Replace hex codes in `styles.css`
5. Grep entire `client/` for old hex codes to catch any missed
6. Build and visually verify content scripts

## Verification Grep

After cleanup, verify zero old colors remain:

```bash
grep -rn "#2563EB\|#1D4ED8\|#18181B\|#71717A\|#E4E4E7\|#F4F4F5\|#EF4444\|#22C55E\|#F59E0B" client/apps/extension/src/
```

Should return 0 results.

## Todo List

- [x] Update autofill-dropdown-styles.ts (light + dark)
- [x] Update autofill-icon.ts
- [x] Update save-banner.ts
- [x] Update styles.css
- [x] Update inline SVGs
- [x] Grep verify: zero old hex codes
- [x] Visual test content scripts

## Success Criteria

- Zero old Vaultic hex codes in codebase
- Content scripts render correctly with VIUI colors
- Dark mode content script matches VIUI dark tokens
