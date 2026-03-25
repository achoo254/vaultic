---
phase: 4
status: completed
priority: medium
effort: 2h
---

# Phase 4: Interactive Components

## Overview
Create ToggleGroup (segmented control), PillGroup (chip selector), and Modal components. These are the most complex patterns currently duplicated.

## Components to Create

### ToggleGroup (`packages/ui/src/components/toggle-group.tsx`)
Segmented control with active/inactive state. Used in share-page (Vault/Quick toggle).

```tsx
interface ToggleGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}
```

Renders: container with surface bg + rounded, buttons with active (white bg + shadow) / inactive (transparent) states.

### PillGroup (`packages/ui/src/components/pill-group.tsx`)
Horizontal pill/chip selector. Used in share-options for TTL and max views selection.

```tsx
interface PillGroupProps<T> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}
```

Renders: row of pills, active = primary bg + white text, inactive = outlined.

### Modal (`packages/ui/src/components/modal.tsx`)
Overlay dialog for confirms/detail views. Used in vault-item-detail (delete confirm, detail view).

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}
```

Renders: fixed overlay + centered card with optional title header.

## Files to Create
- `packages/ui/src/components/toggle-group.tsx`
- `packages/ui/src/components/pill-group.tsx`
- `packages/ui/src/components/modal.tsx`

## Files to Modify
- `packages/ui/src/index.ts` — export new components

## Todo
- [x] Create ToggleGroup with generic value type
- [x] Create PillGroup with pill/active styling from tokens
- [x] Create Modal with overlay + close on backdrop click
- [x] Export from index.ts
- [x] Verify build passes
