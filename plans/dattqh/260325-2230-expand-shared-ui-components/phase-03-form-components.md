---
phase: 3
status: completed
priority: medium
effort: 2h
---

# Phase 3: Form Components

## Overview
Add Checkbox, Select, Textarea, and IconButton to shared UI. Currently raw HTML elements styled inline in each component.

## Components to Create

### Checkbox (`packages/ui/src/components/checkbox.tsx`)
Styled checkbox with label. Used in share-page (2x), settings (1x), password-generator (4x).

```tsx
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}
```

### Select (`packages/ui/src/components/select.tsx`)
Styled native select dropdown. Used in settings-page for dropdown options.

```tsx
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  label?: string;
}
```

### Textarea (`packages/ui/src/components/textarea.tsx`)
Styled textarea. Used in vault-item-form notes, share-page quick share.

```tsx
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
```

### IconButton (`packages/ui/src/components/icon-button.tsx`)
Small button for actions (copy, delete, edit, visibility toggle). Used across vault-item-detail, copy-button, password-field.

```tsx
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outlined';
}
```

## Files to Create
- `packages/ui/src/components/checkbox.tsx`
- `packages/ui/src/components/select.tsx`
- `packages/ui/src/components/textarea.tsx`
- `packages/ui/src/components/icon-button.tsx`

## Files to Modify
- `packages/ui/src/index.ts` — export new components

## Todo
- [x] Create Checkbox with label and accessible markup
- [x] Create Select wrapping native <select>
- [x] Create Textarea with label/error support
- [x] Create IconButton (ghost + outlined variants)
- [x] Export from index.ts
- [x] Verify build passes
