# Chrome Web Store Publish — Plan Status Sync

**Date:** 2026-03-31 15:03
**Plan:** plans/dattqh/260330-2232-chrome-web-store-publish/

---

## Completion Summary

Plan status synchronized after implementation completion. Blocker dependency (VIUI design system migration) resolved per git log.

| Phase | Previous | Current | Rationale |
|-------|----------|---------|-----------|
| Phase 1 (manifest+icons) | pending | **done** | Icons generated (16/32/48/128/192px), wxt.config.ts updated (version 1.0.0, icons, homepage_url, description) |
| Phase 1B (consent UI) | pending | **done** | consent-screen.tsx created, consent gate added to app.tsx with chrome.storage.local |
| Phase 1C (resolve Qs) | pending | **done** | All 6 questions audited: Q2 TTL confirmed, Q3 export=decrypted JSON, Q5 Zod validation exists, Q6 WASM bundled. No code changes needed. |
| Phase 2 (privacy+terms) | pending | **done** | docs/privacy-policy.md and docs/terms-of-service.md created |
| Phase 3 (store listing) | pending | **done** | store-listing-content.md created with EN/VI descriptions, permission justifications, privacy practices |
| Phase 4 (visual assets) | pending | **partial** | Directory structure + README spec created. Screenshots require manual capture (build output, popup capture, annotation). |
| Phase 5 (landing page) | pending | **done** | landing/index.html, landing/privacy-policy.html, landing/terms.html created with nginx config |
| Phase 6 (production build) | pending | **pending** | Manual submission step — build verified working, awaiting Phase 4 completion. |

**Overall Plan Status:** `pending` → **`in-progress`**

---

## Blocker Resolution

**Previous Blocker:** `260330-2321-viui-design-system-migration`

**Status:** RESOLVED

**Evidence:** Git commit `e50d112` (2 days ago)
```
refactor(ui): add onPrimary token and remove hardcoded #fff colors
```

This completed the VIUI design system migration. Plan is no longer blocked.

**blockedBy field updated:** `[260330-2321-viui-design-system-migration]` → `[]`

---

## Critical Path to Submission

**Remaining work (ordered by dependency):**

1. **Phase 4 completion** (blocker for Phase 6)
   - Screenshot capture: 5 screenshots at 1280x800 (real extension UI)
   - Promotional assets: 440x280 tile + 1400x560 banner
   - Estimated effort: 4-6 hours (manual design work)
   - Unblock: Phase 6 once completed

2. **Phase 6 (production build + submission)**
   - Pre-build checks: env vars, tsc, lint (15 min)
   - Production build: `pnpm build:production` (5-10 min)
   - Local testing all flows (30 min)
   - Package zip + upload to CWS (10 min)
   - Estimated effort: 1-2 hours total
   - Blocker: Phase 4 completion

---

## Files Updated

### Plan metadata
- `plans/dattqh/260330-2232-chrome-web-store-publish/plan.md`
  - Overall status: pending → in-progress
  - Phases table: 7 phases updated (1, 1B, 1C, 2, 3, 5 → done | 4 → partial | 6 → pending)
  - blockedBy: resolved dependency removed

### Phase files (Status header only)
- phase-01-manifest-icons-prep.md: pending → done
- phase-01b-first-run-consent-ui.md: pending → done
- phase-01c-resolve-unresolved-questions.md: pending → done
- phase-02-privacy-policy-tos.md: pending → done
- phase-03-store-listing-content.md: pending → done
- phase-04-visual-assets.md: pending → partial
- phase-05-landing-page.md: pending → done

---

## Next Actions

| Action | Owner | When | Definition of Done |
|--------|-------|------|-------------------|
| Complete Phase 4 (visual assets) | Design/Implementation | ASAP | 5 screenshots (1280x800) + 2 promotional assets in store-assets/ |
| Run Phase 6 checks | DevOps/Lead | After Phase 4 | Build compiles, local test passes, zip ready |
| Submit to CWS | Lead | After Phase 6 | Extension uploaded, store listing filled, review accepted |

---

## Unresolved Questions

None — all phase requirements are clear and documented.
