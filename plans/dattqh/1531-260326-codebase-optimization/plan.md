---
status: complete
priority: high
created: 2026-03-26
slug: codebase-optimization
---

# Codebase Optimization Plan

## Context
Brainstorm report: `../reports/brainstorm-1531-260326-codebase-optimization.md`

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Build & Deps](phase-01-build-and-deps.md) | P0 | ~30min | ✅ complete |
| 2 | [Code Quality](phase-02-code-quality.md) | P1 | ~1-2h | ✅ complete |
| 3 | [Testing Setup](phase-03-testing-setup.md) | P1 | ~2-3h | ✅ complete |
| 4 | [Docs Sync](phase-04-docs-sync.md) | P2 | ~1h | ✅ complete |

## Dependencies
- Phase 1 → standalone (no deps)
- Phase 2 → standalone (can parallel with Phase 1)
- Phase 3 → after Phase 2 (test refactored code)
- Phase 4 → after Phase 1-3 (docs reflect final state)

## Success Criteria
- `cargo build --release` uses LTO + strip
- Zero duplicate deps between crates
- All code files <200 lines
- Vitest configured + ≥1 test per TS package
- Docs accurately reflect current implementation status
- `pnpm build && pnpm lint` respects turbo dependency order
