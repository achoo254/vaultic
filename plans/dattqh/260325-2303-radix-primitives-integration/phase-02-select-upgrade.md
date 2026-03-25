---
phase: 2
status: pending
priority: high
effort: 1.5h
---

# Phase 2: Upgrade Select → Radix Select

## Overview
Replace native `<select>` with Radix Select. Gains: fully stylable dropdown, keyboard navigation, screen reader support. Slightly different API (Radix uses `value`/`onValueChange` vs native `onChange`).

## Context
- Current: `packages/ui/src/components/select.tsx` — wraps native `<select>`, can't style dropdown
- Used by: `settings-page.tsx` (auto-lock timeout, clipboard clear)
- Radix Select: custom-styled trigger + content + items

## Install
```bash
pnpm --filter @vaultic/ui add @radix-ui/react-select
```

## Implementation

### New SelectProps (backward-compatible + enhanced)

```tsx
export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  // Keep native onChange for backward compat
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}
```

### Structure

```tsx
import * as RadixSelect from '@radix-ui/react-select';

<RadixSelect.Root value={value} onValueChange={onValueChange}>
  <RadixSelect.Trigger style={triggerStyle}>
    <RadixSelect.Value placeholder={placeholder} />
    <RadixSelect.Icon>▾</RadixSelect.Icon>
  </RadixSelect.Trigger>
  <RadixSelect.Portal>
    <RadixSelect.Content style={contentStyle} position="popper">
      <RadixSelect.Viewport>
        {options.map(opt => (
          <RadixSelect.Item key={opt.value} value={opt.value} style={itemStyle}>
            <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
          </RadixSelect.Item>
        ))}
      </RadixSelect.Viewport>
    </RadixSelect.Content>
  </RadixSelect.Portal>
</RadixSelect.Root>
```

### Style tokens
- Trigger: same as current select (border, radius, height 40, font)
- Content: white bg, border, radius.md, boxShadow, z-index 1001
- Item: padding sm/md, hover → surface bg, active → primary text
- Selected item: checkmark or primary color indicator

## Consumer Changes (settings-page.tsx)
Current uses native `<select>` with `onChange={(e) => ...e.target.value}`. Need to switch to:
```tsx
<Select
  options={[...]}
  value={String(autoLockMin)}
  onValueChange={(v) => { setAutoLockMin(+v); saveSetting('auto_lock_min', +v); }}
/>
```

## Files to Modify
- `packages/ui/src/components/select.tsx` — rewrite with Radix
- `packages/ui/package.json` — add dependency
- `packages/extension/src/components/settings/settings-page.tsx` — update Select usage

## Todo
- [ ] Install @radix-ui/react-select
- [ ] Rewrite select.tsx with Radix Select primitives
- [ ] Style trigger/content/items with design tokens
- [ ] Update settings-page.tsx to use new value/onValueChange API
- [ ] Verify dropdown opens, keyboard nav works, screen reader announces
- [ ] Build passes
