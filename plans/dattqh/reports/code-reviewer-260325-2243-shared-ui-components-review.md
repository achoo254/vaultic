# Code Review: Shared UI Components & Extension Refactor

**Date**: 2026-03-25
**Scope**: 12 new components in `packages/ui/src/components/`, 9 refactored extension files, 1 updated index
**LOC**: ~700 (new components) + ~900 (refactored extension)
**Build**: Verified passing (`@vaultic/ui` + `extension`)

---

## Overall Assessment

Solid extraction. Components are small, consistent with existing Button/Input patterns, and correctly use design tokens. The extension files meaningfully reduce inline style duplication by adopting Stack/VStack/HStack/Card/Checkbox/etc. A few issues worth fixing, one medium-priority.

---

## Critical Issues

None.

---

## High Priority

### H1. No ARIA attributes on any interactive component

Zero `role=` or `aria-` attributes across all 12 new components.

| Component | Missing |
|-----------|---------|
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| ToggleGroup | `role="radiogroup"`, buttons need `role="radio"`, `aria-checked` |
| PillGroup | Same as ToggleGroup |
| IconButton | Needs `aria-label` (icon-only, no visible text) |
| Checkbox | Native `<input type="checkbox">` handles basics, but wrapper `<label>` should ideally use `aria-disabled` when disabled |

**Impact**: Screen reader users cannot navigate modal, toggle, or icon buttons. Extension stores may flag accessibility gaps.

### H2. Missing `type="button"` on non-submit buttons

ToggleGroup (line 53), PillGroup (line 44), and every inline `<button>` in extension files lack `type="button"`. Inside a `<form>`, these default to `type="submit"` and will trigger form submission.

**Affected**: `vault-item-form.tsx` wraps content in `<form>` -- the "Generate" button correctly has `type="button"`, but if ToggleGroup/PillGroup are ever composed inside a form context, they will misfire.

---

## Medium Priority

### M1. Hardcoded colors in Badge variant styles (badge.tsx:12-14)

```ts
success: { backgroundColor: '#DCFCE7', color: '#166534' },
warning: { backgroundColor: '#FEF9C3', color: '#854D0E' },
error:   { backgroundColor: '#FEE2E2', color: '#991B1B' },
```

These are not in `design-tokens.ts`. Same issue in `pill-group.tsx:38` (`#FFFFFF`) and `button.tsx:45` (`#FFFFFF`). Consider adding `colorLight` variants to tokens, or at minimum a `colors.white` token.

### M2. PillGroup uses index as key (pill-group.tsx:28)

```tsx
<button key={i} ...>
```

Using array index as React key. If options reorder or change dynamically, React will reuse wrong DOM nodes. Should use `opt.value` -- but `T` is generic and may not be string-safe. Recommend constraining `T extends string | number` or using `String(opt.value)`.

### M3. Unused `optionGroup` style constant (export-vault.tsx:87)

```ts
const optionGroup: React.CSSProperties = { display: 'flex', gap: tokens.spacing.sm };
```

Defined but never referenced. Dead code from pre-refactor.

### M4. SettingRow `value` prop unused (settings-page.tsx:118)

```ts
function SettingRow({ label, value, children }: { label: string; value: string; ... })
```

`value` is accepted as a prop (lines 64, 73) but never rendered in the component body.

### M5. Inconsistent component patterns: forwardRef vs FC

| Pattern | Components |
|---------|-----------|
| `forwardRef` | Stack, HStack, VStack, Divider, Card, Select, Textarea, IconButton |
| `React.FC` | SectionHeader, Badge, Checkbox, Modal |
| Generic function | ToggleGroup, PillGroup |

Button and Input (existing) use `forwardRef`. For consistency and composability, Checkbox and Modal should also use `forwardRef`. SectionHeader and Badge are less critical since they rarely need refs.

### M6. Modal does not trap focus

When `open=true`, user can Tab out of the modal into background content. For a confirm dialog (used in vault-item-detail delete flow), focus should be trapped inside the modal and returned to trigger element on close.

### M7. Checkbox does not extend HTMLInputElement attributes

Checkbox uses a custom props interface instead of extending `React.InputHTMLAttributes<HTMLInputElement>`. Unlike Select/Textarea/Input, you cannot pass `name`, `id`, `aria-*`, or `data-*` attributes through.

---

## Low Priority

### L1. Duplicated header/back-button patterns across extension files

`containerStyle`, `headerStyle`, `backBtn`, `titleStyle` are copy-pasted identically in: `settings-page.tsx`, `security-health.tsx`, `export-vault.tsx`, `import-passwords.tsx`, `vault-item-detail.tsx`, `vault-item-form.tsx`. Consider extracting a `PageHeader` component into `@vaultic/ui` or a shared extension layout component.

### L2. SectionHeader used as override wrapper in settings-page.tsx

```tsx
<SharedSectionHeader style={{ textTransform: 'none', fontSize: ..., fontWeight: ..., color: ... }}>
```

share-options.tsx overrides almost every style property of SectionHeader. This signals the component API may need a `variant` or `size` prop rather than full style overrides.

### L3. Modal `onClose` callback not wrapped in useCallback dependency

If parent re-renders frequently, the Escape handler will re-attach on every render. Minor perf concern in practice for this extension viewport.

---

## Edge Cases Found by Scout

1. **PillGroup/ToggleGroup with empty options array**: No guard -- renders empty container. Not breaking, but worth a comment or early return.
2. **Modal overlay click + button click race**: `onClick={onClose}` on overlay fires before `stopPropagation` on card children if click lands on card border. Current implementation handles this correctly via `e.stopPropagation()`.
3. **Checkbox onChange callback identity**: Parent must stabilize `onChange` callback or risk unnecessary re-renders. Not unique to this component but worth documenting.
4. **Select with empty options**: Renders empty `<select>` dropdown. No placeholder/empty-state handling.
5. **Stack gap prop without value**: `gap && tokens.spacing[gap]` -- passing `gap="xs"` with value `4` works, but `gap={undefined}` is handled by the spread. Clean.

---

## Positive Observations

- All components correctly spread `...style` last, allowing consumer overrides
- Token usage is consistent -- font family, spacing, radius, font sizes all reference tokens
- `displayName` set on every component (good for React DevTools)
- Stack/HStack/VStack are well-designed -- clean abstraction over flex patterns
- Card variant API (outlined/filled) maps well to the design system
- Modal Escape key handler with proper cleanup
- Index file cleanly organized by category with type re-exports
- Extension files meaningfully benefit from shared components (fewer inline styles)

---

## Recommended Actions

1. **[High]** Add ARIA roles to Modal, ToggleGroup, PillGroup, IconButton
2. **[High]** Add `type="button"` to all button elements in ToggleGroup and PillGroup
3. **[Medium]** Move Badge variant colors to design tokens
4. **[Medium]** Fix PillGroup key from index to value
5. **[Medium]** Remove dead `optionGroup` constant in export-vault.tsx
6. **[Medium]** Remove or use `value` prop in SettingRow
7. **[Medium]** Extend Checkbox to forward native input attributes
8. **[Low]** Extract shared PageHeader pattern from extension files
9. **[Low]** Add `variant` prop to SectionHeader for label vs heading use cases

---

## Metrics

| Metric | Value |
|--------|-------|
| Type coverage | Good -- all props typed, generics used correctly in ToggleGroup/PillGroup |
| Test coverage | No component tests exist (pre-existing gap, not new regression) |
| Linting issues | 1 unused variable (`optionGroup`), 1 unused prop (`value`) |
| Accessibility | 0 ARIA attributes across 12 components |
| Hardcoded colors | 6 instances across Badge + PillGroup + Button |
| Dead code | 2 instances |

---

## Unresolved Questions

1. Should PillGroup/ToggleGroup support multi-select in future? Current API is single-value only. If multi-select is planned, the `value`/`onChange` signature will need breaking changes.
2. Is focus trapping in Modal a requirement for the MVP extension, or deferred?
3. Should the duplicated page header pattern be extracted now or deferred to a layout pass?
