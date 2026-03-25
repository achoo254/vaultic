---
phase: 1
status: pending
priority: high
effort: 1h
---

# Phase 1: Upgrade Modal → Radix Dialog

## Overview
Replace custom Modal with Radix Dialog primitive. Gains: focus trap, return-focus, scroll lock, portal rendering. Keep same ModalProps API.

## Context
- Current: `packages/ui/src/components/modal.tsx` — manual Escape handler, no focus trap
- Used by: `vault-item-detail.tsx` (delete confirm)
- Radix Dialog: unstyled, handles all a11y automatically

## Install
```bash
pnpm --filter @vaultic/ui add @radix-ui/react-dialog
```

## Implementation

### Replace `modal.tsx` internals

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { tokens } from '../styles/design-tokens';

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, title, style }) => (
  <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay style={overlayStyle} />
      <Dialog.Content style={{ ...cardStyle, ...style }}>
        {title && <Dialog.Title style={titleStyle}>{title}</Dialog.Title>}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
```

### Key changes
- Remove manual `useEffect` for Escape — Radix handles it
- Remove `onClick={onClose}` on overlay — Radix `onOpenChange` handles it
- Remove `e.stopPropagation()` trick — Portal renders outside DOM tree
- Keep all CSSProperties styles unchanged (overlay, card, title)

## Files to Modify
- `packages/ui/src/components/modal.tsx` — rewrite internals
- `packages/ui/package.json` — add dependency

## Files NOT Changed
- `packages/ui/src/index.ts` — ModalProps stays same
- `packages/extension/src/components/vault/vault-item-detail.tsx` — API compatible

## Backward Compatibility
ModalProps interface unchanged: `open`, `onClose`, `children`, `title`, `style`. Zero consumer changes.

## Todo
- [ ] Install @radix-ui/react-dialog
- [ ] Rewrite modal.tsx using Dialog primitives
- [ ] Keep same overlay/card/title styles
- [ ] Verify vault-item-detail delete modal works
- [ ] Build passes
