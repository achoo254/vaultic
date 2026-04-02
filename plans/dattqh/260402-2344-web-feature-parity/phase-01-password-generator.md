---
phase: 1
title: Password Generator Full Config
status: pending
effort: small
---

# Phase 1: Password Generator — Full Config Page

## Overview
Replace minimal length-only modal with dedicated generator page. Port from extension's `password-generator-view.tsx` (112 lines).

## Context
- Extension ref: `client/apps/extension/src/components/vault/password-generator-view.tsx`
- Crypto: `generatePassword({ length, uppercase, lowercase, digits, symbols })` from `@vaultic/crypto`
- Current web: Modal in vault-page with length slider only

## Changes

### 1. Create `pages/generator-page.tsx`
Port from extension with adaptations:
- **Length slider**: range 8-64, default 20
- **4 toggle switches**: uppercase, lowercase, digits, symbols (all default true)
- **Strength indicator**: score 0-5 based on length thresholds + enabled options
  - Score color: error (0-2), warning (3), success (4-5)
- **Generated password display** with monospace font
- **Regenerate + Copy buttons**
- Auto-regenerate on any option change

**Strength logic (from extension):**
```typescript
let score = 0;
if (length >= 12) score++;
if (length >= 16) score++;
if (uppercase) score++;
if (digits) score++;
if (symbols) score++;
// 0-2 = weak/error, 3 = medium/warning, 4-5 = strong/success
```

**Toggle row pattern:**
```tsx
// Inline toggle switch — label left, clickable track right
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span>{label}</span>
  <div onClick={onToggle} style={{ /* track + thumb CSS */ }} />
</div>
```

### 2. Update `components/app-layout.tsx`
Add Generator nav item to NAV_ITEMS:
```typescript
{ path: '/generator', label: 'Generator', icon: IconKey }
```
Place between Vault and Share in nav order.

### 3. Update `router.tsx`
Add route: `/generator` → `<AuthGuard><AppLayout><GeneratorPage /></AppLayout></AuthGuard>`

### 4. Remove modal from `vault-page.tsx`
- Remove `PasswordGeneratorModal` component
- Remove `showGenModal` state
- Remove generator button from vault header (nav handles it now)
- Remove `IconKey` import if unused

## Files
| Action | File |
|--------|------|
| CREATE | `client/apps/web/src/pages/generator-page.tsx` |
| UPDATE | `client/apps/web/src/components/app-layout.tsx` |
| UPDATE | `client/apps/web/src/router.tsx` |
| UPDATE | `client/apps/web/src/pages/vault-page.tsx` |

## Success Criteria
- [ ] Dedicated /generator page with all 4 toggles
- [ ] Strength bar shows correct color per score
- [ ] Copy button works
- [ ] Regenerate on any option change
- [ ] Nav item active state correct
- [ ] Old modal removed from vault page
- [ ] `tsc --noEmit` passes
