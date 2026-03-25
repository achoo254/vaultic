---
phase: 2
status: completed
priority: high
effort: 1.5h
---

# Phase 2: Card & Section Components

## Overview
Extract 20+ repeated card/container patterns into reusable Card and Section components.

## Components to Create

### Card (`packages/ui/src/components/card.tsx`)
Container with border, radius, padding, optional header.

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'outlined' | 'filled';  // outlined=border, filled=surface bg
  padding?: keyof typeof tokens.spacing;
}
```

### SectionHeader (`packages/ui/src/components/section-header.tsx`)
Uppercase label used in settings, detail views.

```tsx
interface SectionHeaderProps {
  children: React.ReactNode;
}
```

Renders: `fontSize.xs, fontWeight.semibold, color.secondary, textTransform: uppercase, letterSpacing: 0.5`

### Badge (`packages/ui/src/components/badge.tsx`)
Small status/label indicator.

```tsx
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
}
```

## Files to Create
- `packages/ui/src/components/card.tsx`
- `packages/ui/src/components/section-header.tsx`
- `packages/ui/src/components/badge.tsx`

## Files to Modify
- `packages/ui/src/index.ts` — export new components

## Usage Examples

**Card (before → after):**
```tsx
// Before: 5 lines repeated in 16 files
const cardStyle = { display: 'flex', padding: tokens.spacing.md, border: `1px solid ${tokens.colors.border}`, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.background };

// After:
<Card variant="outlined" padding="md">...</Card>
```

**SectionHeader:**
```tsx
<SectionHeader>Security</SectionHeader>
```

## Todo
- [x] Create Card component (outlined + filled variants)
- [x] Create SectionHeader component
- [x] Create Badge component (4 variants)
- [x] Export from index.ts
- [x] Verify build passes
