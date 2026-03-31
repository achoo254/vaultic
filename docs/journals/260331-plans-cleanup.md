# Plans Cleanup: Deleting 3 Incomplete Plans to Start Fresh

**Date**: 2026-03-31 14:00
**Severity**: Medium
**Component**: Project planning / workflow management
**Status**: Completed

## What Happened

Three plans created in parallel were incomplete and blocking each other's progress. Instead of carrying technical debt into next phase, we're deleting all three and will re-plan with fresh priority order.

## The Brutal Truth

We created plans before the VIUI migration was done, blocking downstream work. CWS publish and auto-update plans sat at 0% for days because we couldn't start them without VIUI. Worse: each plan existed in a vacuum without clear sequencing. Killing them cleans the deck — fresh plans will have proper dependencies and realistic scope.

## Technical Details

**Plans being deleted:**
1. **260330-2321-VIUI-design-system-migration** (80% done)
   - 4/5 phases complete: tokens, icons, colors, dark mode CSS
   - Phase 5 (visual QA) skipped — will handle ad-hoc in extension
   - 26 files migrated to @tabler/icons-react, ~40 hardcoded hex colors replaced with design tokens
   - Accent color locked: #CC0E0E for CTA buttons

2. **260330-2232-chrome-web-store-publish** (0% done)
   - Blocked by VIUI completion
   - Scope: manifest v3 prep, privacy consent UI, policies, store listing, landing page, production build
   - 5-7 day estimate, high priority
   - Decided: full store presence (not sideload-only)

3. **260330-2154-extension-auto-update** (0% done)
   - Blocked by CWS publish
   - Scope: backend update API, extension checker, banner, guide page, auto-zip build
   - 1-2 day estimate, medium priority
   - Critical question: may be unnecessary if CWS handles updates automatically

## What We Tried

Created sequential plans assuming dependencies would flow. Didn't work because VIUI completion date slipped, leaving downstream work stranded. Plans became stale faster than we could execute.

## Root Cause Analysis

**Primary mistake:** Premature planning. We planned CWS publish and auto-update before VIUI was done, creating brittle dependencies on an uncertain completion date. Plans weren't living documents — they collected dust instead of getting re-evaluated daily.

**Secondary issue:** No clear sequencing. Each plan was self-contained without explicit blocking relationships or handoff points. Made it hard to see the critical path.

**Tertiary issue:** Too much scope in early plans. CWS publish scope (5-7 days) was ambitious for a freshly migrated design system. Auto-update bundled too many assumptions about CWS behavior.

## Lessons Learned

1. **Plan only the next 1-2 phases**, not beyond known blockers. Delete and re-plan when blockers resolve.
2. **Mark plan dependencies explicitly** in titles or metadata (e.g., "Phase 2 blocked by Phase 1 completion"). VIUI → CWS → Auto-update was implicit, should have been visible.
3. **Living documents require daily review**. Plans that sit >2 days without progress review become stale noise. Establish a "plan health check" — if no commits/progress in 48h, re-plan.
4. **Separate "research" from "execution" plans**. VIUI was execution (code changes). CWS and auto-update should have been research-first (what's required, what's risky, then plan).
5. **Bias toward deletion over archiving** when starting over. Clean slate beats historical baggage.

## Next Steps

1. **Delete** these three plan directories from `plans/dattqh/`
2. **Create new CWS publish plan** after confirming VIUI phase 5 (visual QA) is truly ad-hoc and not blocking CWS work
3. **Research auto-update necessity**: spike (2h) to determine if CWS auto-update eliminates need for backend logic
4. **Establish plan health check**: daily review of all active plans — kill or refresh any >48h stale
5. **Document sequencing** in new plans: explicit blocking relationships, not implicit assumptions

**Owner**: Project lead
**Timeline**: Plans deleted immediately; CWS re-plan starts after VIUI QA validation (ETA 2-3 days)

## Unresolved Questions

- Should VIUI phase 5 (visual QA) be part of CWS publish plan, or remain ad-hoc extension polish?
- Does CWS auto-update eliminate the need for extension auto-update backend API entirely?
