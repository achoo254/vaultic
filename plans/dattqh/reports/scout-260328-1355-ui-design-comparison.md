# Scout Report: UI Design vs Implementation Comparison

**Date:** 2026-03-28
**Design file:** `system-design.pen` (33 screens)
**Implementation:** `client/apps/extension/src/components/`

---

## Executive Summary

Implementation follows design **~65-70% accuracy**. Structure/layout matches well, but **visual fidelity** has significant gaps. The 3 biggest issues are:

1. **Emoji icons instead of Lucide stroke icons** — affects every screen
2. **Avatar style mismatch** — code uses HSL circles, design uses blue rounded-square globe icons
3. **Bottom nav tabs differ** — design has Health tab, code has Settings tab

---

## Screen-by-Screen Comparison

### Auth Flow

| Screen | Design | Code | Match |
|--------|--------|------|-------|
| 00. Setup Password | Shield icon, "Your secure offline vault", yellow warning | Emoji icon, warning present | 75% |
| 01. Register | Shield-check icon, UPPERCASE labels, eye icon toggle | Emoji eye toggle, labels present | 75% |
| 02. Login | Shield-check icon, "Your secure password vault" | Similar structure | 75% |
| 03. Lock Screen | Lock Lucide icon (blue), email below title | Emoji lock icon, same layout | 70% |
| 03b. Lock Screen (Offline) | "Offline Mode" green badge, "Reset Vault" | Conditional rendering | 70% |

**Auth Issues:**
- [ ] Replace emoji shield/lock with Lucide `shield-check` and `lock` icons
- [ ] Eye toggle uses emoji (👁/🔒) — should use Lucide `eye`/`eye-off` icons
- [ ] Verify label casing matches design (UPPERCASE: EMAIL, MASTER PASSWORD)

### Vault Flow

| Screen | Design | Code | Match |
|--------|--------|------|-------|
| 04. Empty Vault | Centered, X-in-box icon, "Import from browser" link | Emoji 🔐, similar layout | 65% |
| 05. Vault List | Globe icons, SUGGESTED/RECENT sections, folder bar | HSL circle avatars, emoji actions | 60% |
| 06. Credential Detail | Blue globe avatar (48px rounded square), Lucide edit/share/delete | HSL circle avatar, emoji buttons | 55% |
| 07. Add/Edit Credential | Clean inputs, "Generate" button with sparkle icon | Similar structure, emoji sparkle | 70% |
| 08. Delete Confirmation | Modal dialog, centered | Present | 75% |
| 09. Password Generator | Toggle switches, strength bar, "Use this password" | Checkbox instead of toggle, similar | 70% |

**Vault Issues:**
- [ ] **Avatar style** — Design: blue rounded-square with globe icon. Code: HSL-colored circles with initial letter. This is the **biggest visual difference**
- [ ] Vault list item actions use emoji (🔑, ↗) — design uses Lucide `copy`, `external-link` icons
- [ ] Password generator uses checkboxes — design shows toggle switches
- [ ] Empty vault icon should be `package-x` or similar, not emoji

### Settings & Utility

| Screen | Design | Code | Match |
|--------|--------|------|-------|
| 10. Security Health | Donut chart, colored category cards | Score circle, emoji indicators | 65% |
| 19. Settings | Lucide icons per row, clean sections | Emoji icons, similar structure | 65% |
| 19-offline. Settings (Offline) | No Cloud Sync section, "Create Account" button | Conditional rendering | 70% |
| 19c. Upgrade Account | Modal with user-plus icon, green success banner | Similar structure | 70% |
| 22. Folder Management | Folder icons, count badges, inline add | Similar structure | 75% |
| 23. Export Vault | Radio options, warning banner | Similar | 70% |
| 24. Import Passwords | Source grid, upload area | Similar | 70% |

**Settings Issues:**
- [ ] Settings rows use emoji — design has Lucide: `timer`, `clipboard`, `cloud`, `download`, `upload`, `user`, `log-out`
- [ ] Security Health donut chart — code uses simple circle border, design has proper SVG donut
- [ ] Category cards in Security Health use emoji (🔴🟡🟢) — design uses colored backgrounds with Lucide icons

### Share Flow

| Screen | Design | Code | Match |
|--------|--------|------|-------|
| 13. Share - From Vault | Tab selector, item card, checkboxes, pill selectors | Similar structure | 70% |
| 13a. Share - Unified | Size indicator, URL link button | Present | 70% |
| 14. Quick Share | Textarea, same options | Present | 70% |
| 15. Share - Link Created | Check-circle icon, link box, expiry info | Emoji ✅, similar layout | 70% |
| 15b. Link Created (Unified) | Similar | Present | 70% |

**Share Issues:**
- [ ] Share result uses emoji ✅ — design uses Lucide `check-circle` (green)
- [ ] Copy icon should be Lucide `copy`, not emoji 📋

### Recipient Pages (Web)

| Screen | Design | Code | Match |
|--------|--------|------|-------|
| 16. Recipient - View Prompt | Shield icon, red warning, reveal button | Backend HTML | N/A |
| 17. Recipient - Secret Revealed | Value card, yellow warning | Backend HTML | N/A |
| 17b. Credential Revealed | Site info, credential fields | Backend HTML | N/A |
| 18. Link Expired | Alert-circle red, expired message | Backend HTML | N/A |

*(Recipient pages rendered by backend `share-page.html`, not extension components)*

### Bottom Navigation

| Aspect | Design | Code | Status |
|--------|--------|------|--------|
| Tab 1 | Generator (dice icon) | Vault 🔐 | MISMATCH |
| Tab 2 | Vault (grid icon, active blue) | Generator 🎲 | MISMATCH |
| Tab 3 | Share (share icon) | Share 🔗 | OK |
| Tab 4 | Health (shield icon) | Settings ⚙️ | MISMATCH |

**Bottom Nav Issues:**
- [ ] Tab order differs — design: Generator, Vault, Share, Health. Code: Vault, Generator, Share, Settings
- [ ] Design uses Lucide icons — code uses emoji
- [ ] Design has "Health" tab (Security Health) — code has "Settings" tab
- [ ] Active tab in design has filled blue icon + blue text

---

## Critical Issues (Priority Order)

### P0 — Must Fix (Visual Identity)

1. **Replace ALL emoji icons with Lucide React icons** — This single change would improve match from ~65% to ~85%. Every screen uses emoji where design specifies Lucide stroke icons (strokeWidth 1.5).

2. **Fix vault item avatars** — Design uses consistent blue rounded-square with globe `Lucide` icon. Code generates random HSL circles. Need to match design's favicon/globe approach.

3. **Fix bottom navigation** — Tab order, icons, and the Health vs Settings tab difference.

### P1 — Should Fix (Polish)

4. **Toggle switches** — Password generator uses checkboxes, design shows iOS-style toggles
5. **Security Health donut chart** — Replace simple circle border with proper SVG donut/ring
6. **UPPERCASE labels** — Design consistently uses uppercase for field labels (EMAIL, MASTER PASSWORD, etc.)
7. **Font smoothing** — Ensure Inter renders crisply at all sizes

### P2 — Nice to Have

8. **Password field eye icon** — Replace emoji with Lucide `eye`/`eye-off`
9. **Action buttons** — Replace emoji copy/edit/delete with Lucide equivalents
10. **Consistent spacing audit** — Verify padding/gaps match design pixel-for-pixel

---

## Design Token Alignment

| Token | Design Value | Code Value | Match |
|-------|-------------|------------|-------|
| Primary | #2563EB | #2563EB | OK |
| Text | #18181B | #18181B | OK |
| Secondary | #71717A | #71717A | OK |
| Border | #E4E4E7 | #E4E4E7 | OK |
| Background | #FFFFFF | #FFFFFF | OK |
| Error | red | #EF4444 | OK |
| Success | green | #22C55E | OK |
| Warning | amber | #F59E0B | OK |
| Font family | Inter | Inter | OK |
| Font sizes | 11-24px | 11-24px | OK |
| Extension size | 380x520 | 380x520 | OK |
| Border radius | 8px standard | 8px (md) | OK |
| Icon style | Lucide, stroke 1.5 | Emoji | MISMATCH |
| Icon sizes | 16/20/24px | Emoji (variable) | MISMATCH |

**Colors and tokens match perfectly.** The core design system is well-implemented. The main visual gap is **icon system**.

---

## Screens Not Yet Implemented

| Screen | Status |
|--------|--------|
| 11. Autofill Dropdown | Not in extension popup (content script) |
| 12. Save Password Banner | Not in extension popup (content script) |
| 19a. Enable Sync Warning | May be inline in settings |
| 19b. Disable Sync Confirm | May be inline in settings |
| 20. Loading States | Skeleton loader exists but needs verification |
| 21. Error States | Error handling exists but needs verification |

---

## Recommended Action Plan

1. Install `lucide-react` package → replace ALL emoji icons across all components
2. Create `SiteAvatar` component matching design's blue rounded-square style
3. Fix bottom nav tab order and add Health tab
4. Add toggle switch component for generator options
5. Improve Security Health with SVG donut chart
6. Add UPPERCASE text-transform to form labels
7. Final pixel-perfect pass on spacing/padding

**Estimated effort:** ~2-3 sessions for P0+P1 fixes

---

## Unresolved Questions

- Should bottom nav keep "Settings" tab or change to "Health" per design? Settings access would need alternate route.
- Are recipient pages (16-18) fully implemented in `backend/src/static/share-page.html`?
- Should autofill dropdown (11) and save banner (12) be implemented now or deferred?
