---
phase: 3
title: Security Health
status: pending
effort: small
---

# Phase 3: Security Health Page

## Overview
Add password health audit page. Port from extension's `security-health.tsx` (133 lines). Pure read-only analysis — no store mutations.

## Context
- Extension ref: `client/apps/extension/src/components/settings/security-health.tsx`
- Only dependency: `useVaultStore((s) => s.items)` for password list
- No API calls, no crypto — pure client-side analysis

## Changes

### 1. Create `pages/health-page.tsx`
Port from extension with web layout adaptations:

**Analysis logic:**
```typescript
const passwords = items.map(i => i.credential.password).filter(Boolean);
const total = passwords.length;
const weak = passwords.filter(p => (p?.length || 0) < 10).length;
const reused = total - new Set(passwords).size;
const strong = total - weak;
const score = total > 0 ? Math.round(((total - weak - reused) / total) * 100) : 100;
const scoreColor = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.error;
```

**Layout sections:**
1. **Score circle** — SVG circular progress (radius 33, stroke-dasharray animation)
   - Center: `{score}%` text
   - Color: scoreColor
2. **Issue cards** — 3 rows:
   - Weak Passwords (error badge) — `{weak} passwords under 10 characters`
   - Reused Passwords (warning badge) — `{reused} passwords used more than once`
   - Old Passwords (info badge) — placeholder, count 0
3. **Summary bar** — 4 columns: Total, Strong, Medium, Weak

**Inline sub-components:**
- `IssueCard({ icon, label, desc, count, countColor })` — flex row, 52px height
- `SummaryItem({ label, value, color })` — centered column

### 2. Update `components/app-layout.tsx`
Add Health nav item to NAV_ITEMS:
```typescript
{ path: '/health', label: 'Health', icon: IconShieldCheck }
```
Place after Share in nav order. Import `IconShieldCheck` from `@tabler/icons-react`.

**Final nav order:** Vault → Generator → Share → Health → Settings

### 3. Update `router.tsx`
Add route: `/health` → `<AuthGuard><AppLayout><HealthPage /></AppLayout></AuthGuard>`

## Files
| Action | File |
|--------|------|
| CREATE | `client/apps/web/src/pages/health-page.tsx` |
| UPDATE | `client/apps/web/src/components/app-layout.tsx` |
| UPDATE | `client/apps/web/src/router.tsx` |

## Success Criteria
- [ ] Health page shows score circle with correct %
- [ ] Score color: green ≥80, yellow ≥50, red <50
- [ ] Weak/reused counts match actual vault data
- [ ] Issue cards display with correct badge colors
- [ ] Summary bar shows total/strong/medium/weak
- [ ] Empty vault shows 100% score
- [ ] Nav item in sidebar + bottom nav
- [ ] `tsc --noEmit` passes
