# Phase 2: Font Migration (Inter → Nunito Sans)

## Status: `done`
## Priority: High
## Effort: 0.5 day

---

## Overview

Replace Inter with Nunito Sans across all font loading and hardcoded references.

## Related Code Files

- **Modify:** `client/apps/extension/src/assets/styles.css` — Google Fonts import + body font-family
- **Modify:** `client/apps/extension/src/content/save-banner.ts` — hardcoded `font-family: Inter`
- **Modify:** `client/apps/extension/src/content/autofill-dropdown-styles.ts` — hardcoded font-family

## Implementation Steps

### 1. Update styles.css

```css
/* Replace Inter import with Nunito Sans */
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&display=swap');

body {
  font-family: 'Nunito Sans', sans-serif;
}
```

### 2. Update content scripts

Search for `'Inter'` or `font-family` in content scripts and replace with `'Nunito Sans'`.

Files:
- `save-banner.ts` — font-family in banner CSS
- `autofill-dropdown-styles.ts` — font-family in dropdown CSS

### 3. Verify

- Build extension, open popup → verify Nunito Sans renders
- Check content scripts inject correct font
- Test at 14px base: no text overflow in 380px popup

## Todo List

- [ ] Update Google Fonts import in styles.css
- [ ] Update body font-family
- [ ] Update save-banner.ts font-family
- [ ] Update autofill-dropdown-styles.ts font-family
- [ ] Grep for remaining "Inter" references
- [ ] Visual test: popup + content scripts

## Success Criteria

- No references to "Inter" remain in codebase
- Nunito Sans renders correctly in popup and content scripts
- No text overflow at 380px width
