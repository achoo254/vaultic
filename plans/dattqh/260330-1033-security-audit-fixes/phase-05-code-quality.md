# Phase 5: Code Quality (P3)

## Context Links
- [Extension Audit](../reports/code-reviewer-260330-0936-extension-full-security-review.md)
- [Backend Audit](../reports/code-reviewer-260330-0936-backend-full-audit.md)

## Overview
- **Priority:** P3
- **Status:** Completed
- **Effort:** 2h
- **Parallel-safe:** NO — runs AFTER phases 1-4 complete (touches files modified by earlier phases)
- **Blocked by:** Phase 1, Phase 2, Phase 3, Phase 4

## Items Covered

| # | ID | Severity | Issue |
|---|-----|----------|-------|
| 15 | - | P3 | Modularize 4 files over 200 lines |
| 16 | - | P3 | Replace ~15 hardcoded colors with design tokens |
| 17 | - | P3 | DRY duplicate utilities (escapeHtml x3, base64 x2) |
| 18 | M1 | P3 | Fix itemType mismatch (number 1 vs string 'login') |

## Key Insights

- Files over 200 lines: auth-store.ts (443), settings-page.tsx (375), sync-service.ts (213), vault-item-form.tsx (presumed >200)
- ~15 hardcoded color values across popup components (security-health, upgrade-account-modal, setup-password-form, export-vault, share-page)
- `escapeHtml` duplicated in 3 content script files; `uint8ToBase64`/`base64ToUint8` duplicated in auth-store.ts and share-crypto.ts
- itemType default in sync-service.ts line 130 uses `1` (number) instead of `'login'` (string) — already fixed in Phase 1

## Related Code Files

### Files to Modify
- `client/apps/extension/src/stores/auth-store.ts` — extract upgradeToOnline, helpers
- `client/apps/extension/src/components/settings/settings-page.tsx` — extract sync settings hook
- `backend/src/services/sync-service.ts` — extract helpers (already modified by Phase 1)
- `client/apps/extension/src/components/settings/security-health.tsx` — replace hardcoded colors
- `client/apps/extension/src/components/settings/upgrade-account-modal.tsx` — replace hardcoded colors
- `client/apps/extension/src/components/auth/setup-password-form.tsx` — replace hardcoded colors
- `client/apps/extension/src/components/settings/export-vault.tsx` — replace hardcoded colors (already modified by Phase 3)
- `client/apps/extension/src/components/share/share-page.tsx` — replace hardcoded colors

### Files to Create
- `client/apps/extension/src/stores/upgrade-to-online.ts` — extracted upgrade logic
- `client/apps/extension/src/content/utils/escape-html.ts` — shared escapeHtml utility
- `client/apps/extension/src/lib/encoding-utils.ts` — shared base64/uint8 utilities

---

## Implementation Steps

### Item 15: Modularize Over-200-Line Files

#### 15a: auth-store.ts (443 lines → ~200)

After Phase 2 modifies this file, extract:

**Extract `upgradeToOnline` function:**
```
client/apps/extension/src/stores/upgrade-to-online.ts
```
Move the `upgradeToOnline` implementation (60+ lines) into a standalone async function that takes dependencies as parameters:
```typescript
export async function performUpgradeToOnline(params: {
  email: string;
  password: string;
  apiBaseUrl: string;
  currentKey: CryptoKey;
  config: VaultConfig;
}): Promise<UpgradeResult> { ... }
```
The auth-store method becomes a thin wrapper that calls this function and updates Zustand state.

**Extract helper functions:**
Move `computeVerifier`, `uint8ToBase64`, `base64ToUint8` to `lib/encoding-utils.ts` (see Item 17).

#### 15b: settings-page.tsx (375 lines → ~200)

Extract:
- `useSyncSettings()` custom hook — sync toggle logic, sync status polling
- `ThemeSelector` component — theme dropdown
- `AccountSection` component — account info + upgrade trigger

#### 15c: sync-service.ts (213 lines → <200)

After Phase 1 modifies this file:
- Extract the push item/folder processing into helper functions
- The `push()` function builds ops in two loops (folders + items) — can extract `buildFolderOps()` and `buildItemOps()`

#### 15d: vault-item-form.tsx

Check line count after other phases. If still >200, extract form field components.

---

### Item 16: Replace Hardcoded Colors with Design Tokens

**Files and specific values to replace:**

1. **security-health.tsx:20-21** — `#22C55E`, `#F59E0B`, `#EF4444` → semantic color tokens
   ```typescript
   // Define semantic colors in design tokens or component:
   const strengthColors = { strong: colors.success, medium: colors.warning, weak: colors.danger };
   ```
   If `colors.success`/`warning`/`danger` don't exist in design tokens, add them.

2. **security-health.tsx:123** — `#71717A` → `colors.secondary`

3. **upgrade-account-modal.tsx:51,98** — `#EFF6FF`, `#F0FDF4`, `#16A34A` → `colors.primaryLight`, `colors.successLight`, `colors.success`

4. **setup-password-form.tsx:57-58** — `#fef3c7`, `#92400e` → `colors.warningBg`, `colors.warningText`

5. **export-vault.tsx:58** — `#fef3c7`, `#92400e` → same warning tokens

6. **share-page.tsx:150** — `#A1A1AA` → `colors.secondary` or `colors.muted`

**Check design tokens file first:**
```
client/packages/ui/src/styles/design-tokens.ts
```
If semantic colors (success, warning, danger, successLight, warningBg, warningText) don't exist, add them. These are standard UI patterns.

**Tokens to potentially add:**
```typescript
// In design-tokens.ts colors section:
success: '#22C55E',
warning: '#F59E0B',
danger: '#EF4444',
warningBg: '#fef3c7',
warningText: '#92400e',
successBg: '#F0FDF4',
primaryBg: '#EFF6FF',
```

---

### Item 17: DRY Duplicate Utilities

#### 17a: escapeHtml (3 duplicates)

**Current locations:**
- `content/autofill-icon.ts`
- `content/save-banner.ts`
- `content/autofill-inline-add-form.ts`

**Fix:** Create shared utility:
```typescript
// client/apps/extension/src/content/utils/escape-html.ts
const map: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => map[ch]);
}
```

Update all 3 files to import from `./utils/escape-html`.

#### 17b: base64 utilities (2 duplicates)

**Current locations:**
- `stores/auth-store.ts` — `uint8ToBase64`, `base64ToUint8`
- `lib/share-crypto.ts` — same functions (presumably)

**Fix:** Create shared utility:
```typescript
// client/apps/extension/src/lib/encoding-utils.ts
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Also move computeVerifier here:
export async function computeVerifier(rawKeyBuffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', rawKeyBuffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

Update auth-store.ts and share-crypto.ts to import from `./lib/encoding-utils`.

---

### Item 18: Fix itemType Mismatch

**Already fixed in Phase 1** — sync-service.ts line 130 changed from `1` to `'login'`.

Also fix the `as never` cast in credential-handler.ts line 125:
```typescript
// Change:
item_type: 'login' as never,
// To:
item_type: 'login',
```
This requires ensuring the `VaultItem` type accepts `'login'` as a valid `item_type` value (it does via the `ItemType` enum).

---

## Todo List

- [x] Extract `upgradeToOnline` from auth-store.ts into separate module
- [x] Extract `computeVerifier`, `uint8ToBase64`, `base64ToUint8` to encoding-utils.ts
- [x] Extract sync settings hook from settings-page.tsx
- [x] Extract buildFolderOps/buildItemOps helpers from sync-service.ts (if still >200 lines)
- [x] Create `content/utils/escape-html.ts` shared utility
- [x] Update 3 content script files to import shared escapeHtml
- [x] Create `lib/encoding-utils.ts` shared utility
- [x] Update auth-store.ts and share-crypto.ts to import from encoding-utils
- [x] Add semantic color tokens to design-tokens.ts (success, warning, danger, warningBg, etc.)
- [x] Replace hardcoded colors in security-health.tsx (~4 values)
- [x] Replace hardcoded colors in upgrade-account-modal.tsx (~3 values)
- [x] Replace hardcoded colors in setup-password-form.tsx (~2 values)
- [x] Replace hardcoded colors in export-vault.tsx (~2 values)
- [x] Replace hardcoded colors in share-page.tsx (~1 value)
- [x] Fix `as never` cast in credential-handler.ts
- [x] Verify all modularized files are under 200 lines
- [x] Run `tsc --noEmit` for all packages
- [x] Run `pnpm test` for all packages

## Success Criteria

1. No file exceeds 200 lines of code (excluding generated/config files)
2. Zero hardcoded color values in popup components (content scripts exempt)
3. `escapeHtml` and base64 utilities each exist in exactly one location
4. `as never` type casts eliminated
5. `tsc --noEmit` passes, `pnpm test` passes, `pnpm lint` passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Modularization introduces import cycle | Low | Medium | Keep dependency direction: utils <- stores <- components |
| Shared escapeHtml changes behavior | Low | Low | Exact same implementation, just moved |
| New design tokens don't match current visual appearance | Low | Low | Use exact same hex values from existing hardcoded colors |
| Extracting upgradeToOnline breaks Zustand state updates | Medium | Medium | Wrapper in auth-store calls extracted function then `set()` |

## Security Considerations

- No security changes in this phase — strictly refactoring
- Ensure extracted modules don't accidentally expose internals via exports
- Verify escapeHtml in shared module still covers all HTML entities

## Next Steps

- Run full visual regression check on extension popup
- Update `docs/code-standards.md` if new utility patterns established
- Consider adding ESLint rule for max file length enforcement
