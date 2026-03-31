# VIUI Design System Migration

```yaml
status: 80% (phases 1-4 complete, phase 5 pending manual testing)
priority: high
effort: 3 days
branch: feat/viui-design-system
blockedBy: []
blocks: [260330-2232-chrome-web-store-publish]
```

---

## Overview

Migrate Vaultic extension from custom Swiss Clean Minimal design to iNet VIUI corporate design system. Changes: colors, font (Inter→Nunito Sans), icons (lucide→tabler), radius. Spacing unchanged.

## Brainstorm Report
- [brainstorm-260330-2321-viui-design-system-migration.md](../reports/brainstorm-260330-2321-viui-design-system-migration.md)

## Cross-Plan Dependencies

| Plan | Relationship | Notes |
|------|-------------|-------|
| chrome-web-store-publish | This blocks | Screenshots/visual assets need new design first |
| i18n-bilingual-support | Complete | No conflict |

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Update design tokens (colors, font, radius) | `✓ done` | [phase-01](phase-01-update-design-tokens.md) |
| 2 | Font migration (Inter → Nunito Sans) | `✓ done` | [phase-02](phase-02-font-migration.md) |
| 3 | Icon migration (lucide → tabler, 26 files) | `✓ done` | [phase-03](phase-03-icon-migration.md) |
| 4 | Hardcoded colors cleanup | `✓ done` | [phase-04](phase-04-hardcoded-colors-cleanup.md) |
| 5 | Visual QA + design file update | `⏳ pending` | [phase-05](phase-05-visual-qa.md) |

## Key Decisions

- Accent `#CC0E0E` → CTA/highlights (NOT destructive actions)
- Background `#F4F7FA`, card surfaces `#FFFFFF`
- Spacing unchanged (already 4/8px base)
- Radius sm: 6→4, rest unchanged
