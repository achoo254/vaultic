# Loading/State Patterns Implementation Status

## Summary
Search of extension UI codebase (`client/apps/extension/src/`) and UI package (`client/packages/ui/src/`) for design spec loading/state patterns.

---

## 1. Vault List Skeleton - IMPLEMENTED

**Status:** IMPLEMENTED

**File:** `/d/CONG VIEC/vaultic/client/apps/extension/src/components/common/skeleton-loader.tsx`

**Details:**
- Component: `VaultListSkeleton({ rows?: number })`
- Shows 3 skeleton rows by default (configurable)
- Each row displays:
  - Gray circle (36x36) with shimmer animation
  - Two gray bars (lines) with shimmer effect
- Uses shimmer gradient: `linear-gradient(90deg, ${colors.surface} 25%, #e8e8eb 50%, ${colors.surface} 75%)`
- Responsive: flex layout with proper spacing tokens

**Current Status:**
- Component exists but is NOT currently used in `VaultList` component
- VaultList at line 56-58 shows plain "Loading vault..." text instead of skeleton UI
- Component is exported and available for import

**Usage Gap:**
The skeleton component is not integrated into the vault-list loading flow. The VaultList component should import and use `VaultListSkeleton` when `loading === true` instead of showing plain text.

---

## 2. Sync In Progress - NOT IMPLEMENTED

**Status:** MISSING - Progress bar + progress indicator not implemented

**Evidence Found:**
- Sync API exists in `/d/CONG VIEC/vaultic/client/packages/api/src/sync-api.ts` with `push()` and `pull()` methods
- Sync engine exists at `/d/CONG VIEC/vaultic/client/packages/sync/src/sync-engine.ts` with conflict resolution
- Basic sync status tracking in settings: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/settings-page.tsx` lines 48-79
  - Shows simple text status: "Syncing...", "Synced", "Sync failed"
  - Toggle-based sync on/off control
  - No progress tracking

**Missing Components:**
- Progress bar component (no `<progress>` or progress bar component found in UI package)
- "Syncing vault..." text display during sync
- Item count display: "12 of 47 items" during progress
- Real-time sync progress callback/state
- No progress state in sync-engine.ts response (only pushed/pulled counts, not real-time)

---

## 3. Button Loading - PARTIALLY IMPLEMENTED

**Status:** IMPLEMENTED with minimal indicator

**File:** `/d/CONG VIEC/vaultic/client/packages/ui/src/components/button.tsx`

**Details:**
- Button component accepts `loading?: boolean` prop
- When loading:
  - Shows "..." as placeholder (hardcoded 3 dots)
  - Disables button (`disabled || loading`)
  - Reduces opacity to 0.6
  - Cursor changes to "not-allowed"

**Current Implementation (line 36):**
```tsx
{loading && <span style={{ width: 16, height: 16 }}>...</span>}
```

**Issues:**
- No animated spinner/icon (just text "...")
- No "Saving..." text label alongside
- Should pair with actual button text, not replace it
- Doesn't match modern loading spinner patterns

**Usage:**
- Correctly used in VaultItemForm: `<Button ... loading={loading} style={{ width: '100%' }}>{editId ? 'Save Changes' : 'Add Credential'}</Button>`
- Loading state properly managed in form submission

---

## 4. Offline Indicator - NOT IMPLEMENTED

**Status:** MISSING - No UI component for offline banner

**Evidence Found:**
- Network detection exists at `/d/CONG VIEC/vaultic/client/packages/sync/src/sync-engine.ts` line 41:
  ```ts
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
  }
  ```
- Offline/online mode distinction used throughout auth system (offline vs. online vault)
- But NO offline indicator UI banner in extension popup

**Missing Components:**
- Offline banner component (yellow background, "Offline — changes will sync when connected")
- Wifi-off icon display
- Network status hook/provider to track `navigator.onLine`
- Event listeners for `online`/`offline` window events
- Banner placement in app.tsx (should be visible across all views)

**Where It Should Go:**
App shell (`/d/CONG VIEC/vaultic/client/apps/extension/src/entrypoints/popup/app.tsx`) has no offline detection or banner rendering.

---

## File Locations Reference

**Skeleton Component:**
- `/d/CONG VIEC/vaultic/client/apps/extension/src/components/common/skeleton-loader.tsx`

**Vault List (where skeleton should be used):**
- `/d/CONG VIEC/vaultic/client/apps/extension/src/components/vault/vault-list.tsx`

**Button Component (with loading prop):**
- `/d/CONG VIEC/vaultic/client/packages/ui/src/components/button.tsx`

**Settings (where sync toggle exists):**
- `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/settings-page.tsx`

**Network detection:**
- `/d/CONG VIEC/vaultic/client/packages/sync/src/sync-engine.ts` (line 41)

**Auth store (offline/online mode):**
- `/d/CONG VIEC/vaultic/client/apps/extension/src/stores/auth-store.ts`

---

## Implementation Priorities

### High Priority (UI-blocking)
1. **Offline Indicator Banner** - No UI at all, essential for UX
2. **Sync Progress Display** - Basic status exists but no progress bar or item count
3. **Integrate VaultListSkeleton** - Component exists, just needs to be plugged in

### Medium Priority (Polish)
4. **Improve Button Loading Spinner** - Replace "..." with animated spinner + text label

### Infrastructure Gap
- Need to expose sync progress state (current/total items) from sync engine
- Need network status context/hook for offline detection across app

