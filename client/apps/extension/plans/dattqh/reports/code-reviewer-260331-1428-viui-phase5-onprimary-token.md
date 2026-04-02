## Code Review: VIUI Phase 5 — onPrimary Token

### Scope
- Files: 6 (1 token def + 5 consumers)
- Focus: correctness of `#fff` -> `onPrimary` token migration

### Overall Assessment
Clean, mechanical replacement. Token naming follows Material Design convention (`onPrimary` = foreground on primary bg). One medium-priority correctness issue found.

### Critical Issues
None.

### Medium Priority

**1. `toast.tsx` — static `tokens.colors` in module-level style object (not theme-aware)**

`toastStyle` (line 51) uses `tokens.colors.onPrimary` at module scope. Since `onPrimary` is `#FFFFFF` in both themes this is visually correct today, but it breaks the pattern: the component already uses `useTheme()` for `colors` inside the render function (line 20, applied to `backgroundColor` on line 36). If `onPrimary` ever diverges between themes, this style won't react.

Same applies to `settings-page-helpers.tsx` line 48 — `syncToggleThumb` uses static `tokens.colors.onPrimary` at module level.

**Recommendation**: Either (a) accept this as intentional since `onPrimary` is `#FFFFFF` in both themes and document that assumption, or (b) move these into theme-aware hooks/functions for consistency. Low practical risk today.

**2. Pre-existing: toggle thumb style duplication**

Three files define identical toggle thumb styles (settings-page-helpers, password-generator-view, vault-item-form). Not introduced by this PR but worth noting — a shared `ToggleSwitch` component would DRY this up.

### Low Priority

**3. Remaining `#fff` in content scripts**

Six `#fff` references remain in `content/autofill-dropdown-styles.ts`, `content/autofill-icon.ts`, `content/save-banner.ts`. These are CSS template strings injected into host pages and cannot use React tokens — not a migration miss, just documenting for completeness.

### Positive Observations
- Token naming (`onPrimary`) follows standard conventions
- Both light and dark palettes updated simultaneously
- Build + tsc clean

### Recommended Actions
1. (Optional) Move toast/toggle-thumb color into theme-aware scope for consistency
2. (Future) Extract shared `ToggleSwitch` component to reduce duplication

### Unresolved Questions
- Is `onPrimary` intentionally locked to `#FFFFFF` across both themes permanently, or might dark theme diverge later? If permanent, the static usage is fine.
