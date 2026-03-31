# Vaultic Web App — Vite + React SPA

```yaml
status: completed
priority: high
effort: 7-8 days
branch: feat/web-app
blockedBy: []
blocks: []
```

---

## Overview

Add web app to Vaultic monorepo as `client/apps/web/`. Vite + React SPA, 84% code reuse from existing packages + extension. httpOnly cookies for auth. Full feature parity (sync, share, password generator, auto-lock).

## Brainstorm Report

`plans/dattqh/reports/brainstorm-260331-2009-web-app-full-analysis.md`

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 0 | Refactor shared packages | 0.5 day | ✅ completed | [phase-00](phase-00-refactor-shared-packages.md) |
| 1 | Web app shell (Vite + router + layout) | 2 days | ✅ completed | [phase-01](phase-01-web-app-shell.md) |
| 2 | Backend httpOnly auth + web storage | 1.5 days | ✅ completed | [phase-02](phase-02-auth-and-storage.md) |
| 3 | Core features (vault, sync, share) | 1 day | ✅ completed | [phase-03](phase-03-core-features.md) |
| 4 | Web-specific features | 0.5 day | ✅ completed | [phase-04](phase-04-web-specific-features.md) |
| 5 | Test + polish | 2 days | ✅ in progress | [phase-05](phase-05-test-and-polish.md) |

## Dependencies

- Phase 0 → Phase 1 (packages must be refactored before web app imports them)
- Phase 1 → Phase 2 (shell must exist before auth wiring)
- Phase 2 → Phase 3 (auth must work before vault features)
- Phase 3 → Phase 4 (core features before web-specific polish)
- Phase 4 → Phase 5 (all features before testing)

## Key Decisions

- **Vite + React** over Next.js — no SSR needed, less boilerplate, better reuse
- **httpOnly cookies** for refresh token — XSS-proof
- **sessionStorage** for access token + encryption key
- **localStorage** for user info, vault config, theme/language
- **setInterval + visibilitychange** for sync scheduling (replaces chrome.alarms)
