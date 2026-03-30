# Code Review: i18n Bilingual Support

## Scope
- Files: ~45 changed (5 new locale pairs, i18n config, I18nProvider, sync-preferences, backend model/routes, 31+ components)
- Focus: Security, correctness, race conditions, type safety, preferences sync

## Overall Assessment
Solid implementation. Namespace separation is clean, all EN/VI keys are 1:1 parity, TypeScript augmentation is correct, and auth middleware is present on preference endpoints. A few issues found, one critical race condition.

---

## Critical Issues

### 1. Race Condition: `pushPreferencesToServer` reads stale language from storage

**File:** `client/packages/ui/src/styles/i18n-provider.tsx` lines 41-47, `client/apps/extension/src/lib/sync-preferences.ts` lines 7-25

In `I18nProvider.setLanguage()`, `onLanguageChange` fires **synchronously before** `chrome.storage.local.set()` completes. The callback in `app.tsx` calls `pushPreferencesToServer()`, which reads `vaultic_language` from `chrome.storage.local` -- it will read the **previous** language value.

```tsx
// i18n-provider.tsx line 41-47
const setLanguage = useCallback((newLang: Language) => {
  setLanguageState(newLang);
  onLanguageChange?.(newLang);                          // fires push
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ [STORAGE_KEY]: newLang }); // writes AFTER push reads
  }
}, [onLanguageChange]);
```

**Fix:** Either (a) await the storage write before calling `onLanguageChange`, or (b) pass the new language value directly to `pushPreferencesToServer` instead of re-reading from storage:

```ts
// Option B (simpler): sync-preferences.ts accepts override
export async function pushPreferencesToServer(overrides?: { language?: string; theme?: string }): Promise<void> {
  const stored = await chrome.storage.local.get(['sync_enabled', 'vaultic_language', 'vaultic_theme']);
  if (!stored.sync_enabled) return;
  const prefs = {
    language: overrides?.language || stored.vaultic_language || 'en',
    theme: overrides?.theme || stored.vaultic_theme || 'system',
    updatedAt: Date.now(),
  };
  // ...
}
```

Same race exists for theme changes in `settings-page.tsx:80` where `setThemeMode` + `pushPreferencesToServer` fire without waiting for the ThemeProvider to persist.

---

## High Priority

### 2. `pushPreferencesToServer` never updates `vaultic_prefs_updated_at` locally

**File:** `client/apps/extension/src/lib/sync-preferences.ts`

`pullPreferencesFromServer` compares `serverTime > localTime` using `vaultic_prefs_updated_at`, but `pushPreferencesToServer` never writes this key after pushing. On next pull, the server's `updatedAt` will always be newer than local (which stays at 0), causing a pull to overwrite local preferences even when local is the source of truth.

**Fix:** After successful push, write `vaultic_prefs_updated_at`:
```ts
await fetchWithAuth('/api/v1/sync/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
await chrome.storage.local.set({ vaultic_prefs_updated_at: prefs.updatedAt });
```

### 3. Backend preferences schema allows arbitrary strings

**File:** `backend/src/routes/sync-route.ts` lines 66-70

```ts
language: z.string().min(1).max(10),
theme: z.string().min(1).max(20),
```

No enum validation. A malicious client can store any string (e.g., path traversal, script payloads) in the `preferences` field. While these values are only echoed back to the same user, defense-in-depth says validate:

```ts
language: z.enum(['en', 'vi']),
theme: z.enum(['light', 'dark', 'system']),
```

### 4. `onLanguageChange` missing from useEffect dependency array

**File:** `client/packages/ui/src/styles/i18n-provider.tsx` line 39

```tsx
useEffect(() => {
  // calls onLanguageChange?.(...)
}, []); // <-- onLanguageChange not in deps
```

If the parent re-renders with a different `onLanguageChange` callback before storage loads, the effect uses a stale reference. In practice this is unlikely since `app.tsx` passes an inline arrow, but it's a correctness bug. Either add `onLanguageChange` to deps or use a ref.

---

## Medium Priority

### 5. Duplicate `Language` type definition

Two separate `Language` types that must stay in sync:
- `client/packages/ui/src/styles/i18n-provider.tsx:6` — `'en' | 'vi'` (hardcoded)
- `client/apps/extension/src/i18n/i18n-config.ts:22` — derived from `supportedLanguages`

If a new language is added to `supportedLanguages`, the UI provider type won't update. The UI package should either import from the extension config or the extension should use the UI type.

**Fix:** Export `Language` only from one source. Since `@vaultic/ui` is the shared package, define `supportedLanguages` there and derive the type.

### 6. `pullPreferencesFromServer` does not apply language/theme changes to runtime

**File:** `client/apps/extension/src/lib/sync-preferences.ts` lines 28-56

`pullPreferencesFromServer` writes to `chrome.storage.local` but does not call `i18n.changeLanguage()` or `setThemeMode()`. The UI won't update until the next popup open. For a sync-on-demand scenario, the user clicks "Sync Now", preferences pull succeeds, but the language stays the same in the current session.

**Fix:** Return the pulled values and let the caller apply them:
```ts
export async function pullPreferencesFromServer(): Promise<{ language?: string; theme?: string } | false> { ... }
```

### 7. `escapeValue: false` is intentional but undocumented

**File:** `client/apps/extension/src/i18n/i18n-config.ts` line 38

`interpolation: { escapeValue: false }` is correct for React (JSX auto-escapes), but should have a comment explaining why. Without it, a future developer might think it's a security oversight.

### 8. Sync status strings not translated in `use-sync-settings.ts`

**File:** `client/apps/extension/src/components/settings/use-sync-settings.ts`

Lines 29, 37, 54, 65, 70, 76, 91 use hardcoded English strings:
- `'Local only'`
- `'Synced'`
- `'Syncing...'`
- `'Failed: ...'`
- `'Sync failed'`

These bypass i18n. The hook doesn't call `useTranslation()` (hooks calling hooks is fine). Either use `t()` in the hook or return status codes and translate in the component.

---

## Low Priority

### 9. All locale JSON loaded eagerly

All 10 JSON files are statically imported. For 2 languages this is fine (~5-10KB total). Document that lazy loading should be considered if language count exceeds 4-5.

### 10. `use-sync-settings.ts` line 37 — hardcoded status text

`setSyncStatus('Synced')` on mount when `sync_enabled` is true. This is the raw English string shown in the settings hint. See item 8.

---

## Positive Observations

- Clean namespace separation (common, auth, vault, settings, share) — good for tree-shaking awareness
- 100% EN/VI key parity verified programmatically
- TypeScript augmentation via `declare module 'i18next'` is correct and enables type-safe `t()` calls
- Auth middleware (`authRequired`) present on both preference endpoints
- Zod validation on preference push body
- `pullPreferencesFromServer` uses LWW timestamp comparison correctly (modulo the missing local write on push)
- `pushPreferencesToServer` silently fails when sync disabled — correct for best-effort UX
- `fetchWithAuth` handles 401 refresh properly

---

## Recommended Actions (Priority Order)

1. **Fix race condition** in `setLanguage` — pass language value directly to push function
2. **Write `vaultic_prefs_updated_at`** after successful push to prevent pull from always overwriting
3. **Add enum validation** on backend preferences schema
4. **Translate sync status strings** in `use-sync-settings.ts`
5. **Unify `Language` type** to single source of truth
6. **Add `onLanguageChange` to useEffect deps** or use ref pattern
7. **Have `pullPreferencesFromServer` apply changes** to runtime i18n/theme

## Unresolved Questions

- Is there a plan to call `pullPreferencesFromServer` on popup open (not just on "Sync Now")? If not, preferences pulled from server won't apply until manual sync.
- Should preference sync be bidirectional on every vault sync, or only on explicit settings changes?
