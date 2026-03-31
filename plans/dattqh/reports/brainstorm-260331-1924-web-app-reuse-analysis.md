# Brainstorm: Vaultic Web App — Codebase Reuse Analysis

**Date:** 2026-03-31
**Decision:** Vite + React SPA, httpOnly cookies auth, full features

## Summary

Vaultic monorepo ~84% reusable for web app. ~1,170 LOC new code needed. Estimated 7-8 days.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vite + React | SPA, no SSR needed, less boilerplate than Next.js (~220 LOC less, ~10 fewer files) |
| Auth | httpOnly cookies | More secure than sessionStorage for refresh tokens |
| Features | Full parity | sync scheduling, password generator, auto-lock, clipboard — all reimplemented with web APIs |

## Reuse Breakdown

| Component | LOC | Reuse % |
|-----------|-----|---------|
| @vaultic/types | 220 | 100% drop-in |
| @vaultic/crypto | 363 | 100% drop-in |
| @vaultic/storage | 401 | 100% drop-in |
| @vaultic/sync | 261 | 100% drop-in |
| @vaultic/api | 139 | 100% drop-in |
| @vaultic/ui | 904 | 97% (provider adapter needed) |
| Extension components | 2,500 | 100% copy |
| Extension lib utils | 800 | 45% (rewrite storage/auth) |
| Backend | 1,312 | 92% (add cookie endpoints) |

**Total: 84% reuse, 1,170 LOC new**

## What's NOT Reused (Dropped)

- WXT entrypoints (~200 LOC) — extension framework
- Content scripts (~400 LOC) — form detection/autofill
- Background handlers using chrome.alarms (~300 LOC)
- Chrome types/config (~100 LOC)

## What's Reimplemented for Web (~440 LOC)

- `session-storage.ts` → `web-storage.ts` (sessionStorage/localStorage)
- Auth flow → httpOnly cookie endpoints
- Auto-lock → `visibilitychange` + `setTimeout`
- Sync scheduling → `setInterval` + `visibilitychange`
- Clipboard clear → `setTimeout`
- ThemeProvider/I18nProvider → localStorage adapter

## New Code (~730 LOC)

- Vite config + React router + layout + responsive shell (~600 LOC)
- Backend cookie auth endpoints (~100 LOC)
- Provider adapters (~30 LOC)

## Next Steps

Create implementation plan with phases for Vite+React web app.
