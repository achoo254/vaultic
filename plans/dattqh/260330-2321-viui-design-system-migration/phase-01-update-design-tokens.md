# Phase 1: Update Design Tokens

## Status: `done`
## Priority: High
## Effort: 0.5 day

---

## Overview

Replace all color values, font family, and radius in `design-tokens.ts` with VIUI tokens. This is the single source of truth — all components using tokens will auto-update.

## Related Code Files

- **Modify:** `client/packages/ui/src/styles/design-tokens.ts`

## Implementation Steps

### 1. Replace lightColors

```typescript
export const lightColors = {
  primary: '#024799',
  primaryHover: '#023A7A',
  accent: '#CC0E0E',
  accentHover: '#A80B0B',
  text: '#0F1E2D',
  secondary: '#4A6278',
  border: '#D0DAE6',
  background: '#F4F7FA',
  surface: '#FFFFFF',
  error: '#B91C1C',
  success: '#0E9F6E',
  warning: '#D47B0A',
  info: '#8ABDEF',
  badgeSuccessBg: '#ECFDF5', badgeSuccessText: '#065F46',
  badgeWarningBg: '#FFFBEB', badgeWarningText: '#92400E',
  badgeErrorBg: '#FEF2F2', badgeErrorText: '#991B1B',
  badgeInfoBg: '#EFF6FF', badgeInfoText: '#1E40AF',
  warningBg: '#FFFBEB', warningText: '#92400E',
  successBg: '#ECFDF5', successText: '#065F46',
  primaryBg: '#EFF6FF',
} as const;
```

### 2. Replace darkColors

```typescript
export const darkColors = {
  primary: '#619EE9',
  primaryHover: '#4F8AD6',
  accent: '#ED7B7B',
  accentHover: '#E05A5A',
  text: '#E6EDF3',
  secondary: '#8B949E',
  border: '#21262D',
  background: '#0D1117',
  surface: '#161B22',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#619EE9',
  badgeSuccessBg: '#0A2A1F', badgeSuccessText: '#34D399',
  badgeWarningBg: '#2A1F06', badgeWarningText: '#FBBF24',
  badgeErrorBg: '#450A0A', badgeErrorText: '#FECACA',
  badgeInfoBg: '#0A1628', badgeInfoText: '#93C5FD',
  warningBg: '#2A1F06', warningText: '#FBBF24',
  successBg: '#0A2A1F', successText: '#34D399',
  primaryBg: '#0A1628',
} as const;
```

### 3. Update font + radius

```typescript
font: {
  family: "'Nunito Sans', sans-serif",
  // sizes, weights, lineHeight unchanged
},
radius: { sm: 4, md: 8, lg: 12, full: 9999 },
```

### 4. Update ThemeColors type

Add new tokens (`accent`, `accentHover`, `info`, `badgeInfoBg`, `badgeInfoText`) to the type.

### 5. Verify

```bash
cd client && pnpm tsc --noEmit
```

## Todo List

- [ ] Replace lightColors with VIUI values
- [ ] Replace darkColors with VIUI values
- [ ] Update font family to Nunito Sans
- [ ] Update radius sm: 6→4
- [ ] Add accent + info tokens
- [ ] Type check passes

## Success Criteria

- `tsc --noEmit` passes
- All existing token references still valid (no breaking type changes)
- New tokens (accent, info) available for use
