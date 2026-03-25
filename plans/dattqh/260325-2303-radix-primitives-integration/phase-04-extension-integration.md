---
phase: 4
status: pending
priority: medium
effort: 1h
---

# Phase 4: Extension Integration & Verification

## Overview
Wrap extension app with TooltipProvider, update consumers that need API changes, add Tooltips to icon buttons, verify build + bundle size.

## Consumer Updates

### 1. app.tsx — Add TooltipProvider
```tsx
import { TooltipProvider } from '@vaultic/ui';
// Wrap entire app
<TooltipProvider>...</TooltipProvider>
```

### 2. settings-page.tsx — Select API change (from phase 2)
Replace native `<select>` with new Radix Select API (`value`/`onValueChange`).

### 3. vault-item-detail.tsx — Add Tooltips to icon buttons
```tsx
<Tooltip content="Edit">
  <button onClick={onEdit} style={iconBtn}>✏️</button>
</Tooltip>
<Tooltip content="Delete">
  <button onClick={() => setShowDeleteConfirm(true)} style={iconBtn}>🗑️</button>
</Tooltip>
```

### 4. password-generator-view.tsx — Add Tooltips
```tsx
<Tooltip content="Copy"><CopyButton ... /></Tooltip>
<Tooltip content="Regenerate"><button ... /></Tooltip>
```

### 5. copy-button.tsx — Add Tooltip
Wrap the copy button with Tooltip showing "Copy" / "Copied!" state.

## Verification Checklist
- [ ] Modal: Tab cycles within dialog, Escape closes, focus returns to trigger
- [ ] Select: Opens with Space/Enter, arrow keys navigate, type-ahead works
- [ ] Tooltip: Shows on hover (300ms delay), shows on focus, hides on Escape
- [ ] Bundle size ≤ 470 KB
- [ ] No visual regression on all screens
- [ ] Extension build passes

## Files to Modify
- `packages/extension/src/entrypoints/popup/app.tsx`
- `packages/extension/src/components/settings/settings-page.tsx`
- `packages/extension/src/components/vault/vault-item-detail.tsx`
- `packages/extension/src/components/vault/password-generator-view.tsx`
- `packages/extension/src/components/common/copy-button.tsx`

## Todo
- [ ] Add TooltipProvider to app.tsx
- [ ] Update settings-page Select usage
- [ ] Add Tooltips to vault-item-detail icon buttons
- [ ] Add Tooltips to password-generator buttons
- [ ] Add Tooltip to copy-button
- [ ] Run build, check bundle size
- [ ] Manual accessibility verification (keyboard, screen reader)
