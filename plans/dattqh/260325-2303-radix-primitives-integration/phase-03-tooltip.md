---
phase: 3
status: pending
priority: medium
effort: 0.5h
---

# Phase 3: Add Tooltip Component

## Overview
New Tooltip component using Radix Tooltip. Wrap icon buttons with hover/focus tooltips for accessibility. Currently icon buttons have `title` attr only — not accessible to keyboard users.

## Context
- IconButtons in vault-item-detail (edit, delete), password-generator (copy, regenerate), copy-button
- `title` attr is inaccessible to screen readers on focus
- Radix Tooltip: shows on hover+focus, proper aria-describedby, delay configurable

## Install
```bash
pnpm --filter @vaultic/ui add @radix-ui/react-tooltip
```

## Implementation

### TooltipProvider (wrap app once)

```tsx
// In extension's app.tsx or main.tsx
import { TooltipProvider } from '@vaultic/ui';
<TooltipProvider><App /></TooltipProvider>
```

### Tooltip component

```tsx
import * as RadixTooltip from '@radix-ui/react-tooltip';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', delayMs = 300 }) => (
  <RadixTooltip.Root delayDuration={delayMs}>
    <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
    <RadixTooltip.Portal>
      <RadixTooltip.Content side={side} sideOffset={4} style={tooltipStyle}>
        {content}
        <RadixTooltip.Arrow style={{ fill: tokens.colors.text }} />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  </RadixTooltip.Root>
);
```

### Style
- Background: tokens.colors.text (dark bg)
- Color: tokens.colors.background (white text)
- Font: tokens.font.size.xs
- Padding: 4px 8px
- Radius: tokens.radius.sm
- Arrow: same dark color

## Files to Create
- `packages/ui/src/components/tooltip.tsx`

## Files to Modify
- `packages/ui/src/index.ts` — export Tooltip, TooltipProvider
- `packages/ui/package.json` — add dependency

## Todo
- [ ] Install @radix-ui/react-tooltip
- [ ] Create tooltip.tsx with Radix Tooltip
- [ ] Export from index.ts
- [ ] Build passes
