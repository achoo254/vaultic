# Code Review: VIUI Design System Migration — Phase 3 + Phase 4

**Date:** 2026-03-31
**Reviewer:** code-reviewer
**Commit:** e7b4503 `refactor(ui): begin VIUI design system migration (tokens, fonts, icons)`

## Scope

- **Files reviewed:** 11 changed files (excluding pnpm-lock.yaml, session-state)
- **Phase 3:** Icon migration (lucide-react -> @tabler/icons-react) — 7 component files
- **Phase 4:** Hardcoded colors cleanup (Swiss hex -> VIUI hex) — 4 content/component files
- **TypeScript:** Compiles clean (`tsc --noEmit` passes)
- **Scout findings:** Residual hardcoded colors, missing dark mode overrides, stale dependency

## Overall Assessment

Migration is mechanically sound. Icon name mappings are correct, `strokeWidth` -> `stroke` prop changes are consistent, and the primary Swiss-to-VIUI color mapping is applied correctly across all targeted files. No old Swiss hex values (`#2563EB`, `#18181B`, `#71717A`, `#E4E4E7`, etc.) remain anywhere in `client/apps/extension/src/`. Dark mode coverage in content scripts is comprehensive.

Several medium-priority issues found by scouting adjacent files.

---

## Critical Issues

None.

## High Priority

### H1. Hardcoded hex where design tokens exist — share-link-result.tsx

**Lines 53, 56, 79, 92-93** still use raw hex instead of `colors.*` tokens:

| Line | Current | Should be |
|------|---------|-----------|
| 53 | `backgroundColor: '#ECFDF5'` | `colors.badgeSuccessBg` (or `colors.successBg`) |
| 56, 79 | `color="#0E9F6E"` | `colors.success` |
| 92 | `backgroundColor: '#fef3c7'` | `colors.warningBg` (`#FFFBEB`) |
| 93 | `color: '#92400e'` | `colors.warningText` |

**Impact:** Line 92 is a **wrong color** — `#fef3c7` (Tailwind amber-100) does not match the VIUI token `warningBg: '#FFFBEB'` (amber-50). The others match token values but bypass the token system, so dark mode won't apply.

### H2. Hardcoded hex where design tokens exist — enable-sync-modal.tsx

**Line 23:** `backgroundColor: '#EFF6FF'` should be `colors.primaryBg` or `colors.badgeInfoBg`.

Same value but bypasses token system — dark mode will render a light blue circle bg on a dark page.

### H3. Hardcoded hex in security-health.tsx IssueCard props

**Lines 66, 73, 80:** `bg`, `borderColor`, `darkBg`, `darkBorder` are all raw hex. The `bg` values match existing tokens (`badgeErrorBg`, `badgeWarningBg`), but border colors (`#FECACA`, `#FDE68A`, `#BAE6FD`) and dark variants (`#450A0A`, `#422006`, `#0C4A6E`) have no token equivalents.

**Line 76, 79:** `#0EA5E9` (Tailwind sky-500) is used for old passwords icon — not in VIUI palette. Needs a deliberate design decision: map to `colors.info` (#8ABDEF) or add a dedicated info icon color token.

## Medium Priority

### M1. `lucide-react` still in `@vaultic/ui` package.json

`client/packages/ui/package.json` line 15 still lists `"lucide-react": "^0.468"` as a dependency, but zero imports of lucide-react exist in `client/packages/ui/src/`. This is a stale dependency — increases bundle/install size for no reason.

### M2. app-header.tsx not migrated (out of scope but flagged)

`client/apps/extension/src/components/common/app-header.tsx` lines 70-74 use `#FEF3C7`, `#FDE68A`, `#92400E` — old Tailwind amber colors. Should use `colors.warningBg` / `colors.warningText` / `colors.badgeWarningBg`. Not in Phase 4 scope but should be tracked for next pass.

### M3. Dark mode gaps in autofill-dropdown-styles.ts (pre-existing)

Several light-mode selectors lack dark overrides:
- `.vaultic-af-logo` (color `#024799`) — should be `#619EE9` in dark
- `.vaultic-btn-save` (bg `#024799`) — should be `#619EE9` in dark
- `.vaultic-add-error` (color `#B91C1C`) — should be `#F87171` in dark
- `.vaultic-icon:hover` (rgba based on `#024799`) — needs dark variant

These were pre-existing before this PR but are now more visible since surrounding colors were updated.

### M4. `@tabler/icons-react` not added to package.json

Wait — actually it IS added at line 16: `"@tabler/icons-react": "^3.41.1"`. Confirmed correct.

## Low Priority

### L1. `tokens.icon.strokeWidth` not used

Design tokens define `tokens.icon.strokeWidth: 1.5` but all icon usages hardcode `stroke={1.5}`. Consider using `stroke={tokens.icon.strokeWidth}` for consistency. Minor — current approach works fine.

### L2. Trailing newline removed from save-banner.ts

Last line (empty line) was removed. No functional impact, just noting for completeness.

---

## Positive Observations

1. **Complete lucide-react removal from extension** — zero remaining imports, `lucide-react` removed from extension package.json
2. **Icon name mapping accuracy** — all lucide -> tabler mappings verified correct:
   - `CloudOff` -> `IconCloudOff`, `Trash2` -> `IconTrash`, `Pause` -> `IconPlayerPause`
   - `Cloud` -> `IconCloud`, `ShieldCheck` -> `IconShieldCheck`
   - `ArrowLeft` -> `IconArrowLeft`, `Download` -> `IconDownload`, `AlertTriangle` -> `IconAlertTriangle`
   - `Upload` -> `IconUpload`, `ShieldAlert` -> `IconShieldExclamation`
   - `Copy` -> `IconCopy`, `Timer` -> `IconClock`, `ChevronRight` -> `IconChevronRight`
   - `Folder` -> `IconFolder`
3. **Prop migration correct** — `strokeWidth={1.5}` -> `stroke={1.5}` applied consistently; SVG element `strokeWidth` on `<circle>` correctly left alone
4. **Dark mode in content scripts** — comprehensive dark override blocks with proper VIUI dark palette (#0D1117, #161B22, #30363D, #E6EDF3, #8B949E, #619EE9)
5. **Color mapping consistency** — all ~40 color replacements in content scripts follow the documented mapping correctly

## Recommended Actions

1. **[High]** Replace hardcoded hex with `colors.*` tokens in share-link-result.tsx (H1) — especially fix `#fef3c7` -> `colors.warningBg`
2. **[High]** Replace `#EFF6FF` with `colors.primaryBg` in enable-sync-modal.tsx (H2)
3. **[Medium]** Remove stale `lucide-react` from `@vaultic/ui` package.json (M1)
4. **[Medium]** Add dark mode overrides for `.vaultic-af-logo`, `.vaultic-btn-save`, `.vaultic-add-error` in dropdown CSS (M3)
5. **[Medium]** Track app-header.tsx for next migration pass (M2)
6. **[Low]** Decide on `#0EA5E9` replacement in security-health.tsx — map to `colors.info` or add token

## Metrics

- Type Coverage: Pass (tsc --noEmit clean)
- Old Swiss hex remaining in extension/src: 0
- Remaining hardcoded hex that have token equivalents: ~12 instances across 4 files
- Dark mode coverage gaps (content scripts): 4 selectors missing overrides

## Unresolved Questions

1. Should `#0EA5E9` (sky blue for "old passwords") map to `colors.info` (#8ABDEF) or get its own token?
2. Should security-health IssueCard dark bg/border colors (#450A0A, #422006, etc.) become design tokens, or are per-component dark overrides acceptable?
3. Is app-header.tsx intentionally deferred from Phase 4, or was it missed?
