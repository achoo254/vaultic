---
status: completed
priority: medium
estimated_effort: 8h
---

# Expand Shared UI Components — @vaultic/ui

## Problem
22 extension components repeat same styling patterns (47 flex layouts, 20+ card containers, 6 checkboxes, etc.). Only Button and Input exist as shared components. Violates DRY.

## Goal
Extract repeated patterns into reusable components in `@vaultic/ui`. Reduce boilerplate ~40%, improve consistency, keep TypeScript CSSProperties approach (no Tailwind).

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Layout primitives](phase-01-layout-primitives.md) | 1.5h | completed |
| 2 | [Card & Section](phase-02-card-section.md) | 1.5h | completed |
| 3 | [Form components](phase-03-form-components.md) | 2h | completed |
| 4 | [Interactive components](phase-04-interactive-components.md) | 2h | completed |
| 5 | [Refactor extension components](phase-05-refactor-extension.md) | 1h | completed |

## Dependencies
- None — purely additive to existing `@vaultic/ui` package

## Constraints
- Keep TypeScript CSSProperties approach (no CSS framework)
- All components must use existing design tokens
- Extension size: 380x520px fixed viewport
- No new package dependencies (React + Lucide already available)

## Success Criteria
- All new components exported from `@vaultic/ui`
- Extension build passes
- Inline style duplication reduced significantly
- No visual regression in extension UI
