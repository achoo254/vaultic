---
phase: 1
status: completed
priority: high
effort: 1.5h
---

# Phase 1: Layout Primitives

## Overview
Create Stack, HStack, VStack components to eliminate 47 repeated flex layout definitions across 18 files.

## Components to Create

### Stack (`packages/ui/src/components/stack.tsx`)
Base flex container with configurable direction, gap, alignment.

```tsx
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: keyof typeof tokens.spacing;  // xs|sm|md|lg|xl|xxl|xxxl
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  flex?: number | string;
}
```

### HStack — `Stack` with `direction="row"` default
### VStack — `Stack` with `direction="column"` default

Both are thin wrappers:
```tsx
export const HStack = (props: Omit<StackProps, 'direction'>) => <Stack direction="row" {...props} />;
export const VStack = (props: Omit<StackProps, 'direction'>) => <Stack direction="column" {...props} />;
```

### Divider (`packages/ui/src/components/divider.tsx`)
Horizontal/vertical separator line.

```tsx
interface DividerProps {
  direction?: 'horizontal' | 'vertical';
}
```

## Files to Create
- `packages/ui/src/components/stack.tsx`
- `packages/ui/src/components/divider.tsx`

## Files to Modify
- `packages/ui/src/index.ts` — export new components

## Usage Examples (before → after)

**Before:**
```tsx
const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg,
  padding: tokens.spacing.lg,
};
<div style={containerStyle}>...</div>
```

**After:**
```tsx
<VStack gap="lg" style={{ padding: tokens.spacing.lg }}>...</VStack>
```

## Todo
- [x] Create Stack component with token-based gap
- [x] Create HStack/VStack wrappers
- [x] Create Divider component
- [x] Export from index.ts
- [x] Verify build passes
