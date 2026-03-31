# Phase 3: Icon Migration (lucide-react → @tabler/icons-react)

## Status: `done`
## Priority: High (largest effort phase)
## Effort: 1-1.5 days

---

## Overview

Replace all `lucide-react` imports with `@tabler/icons-react` across 26 component files. Tabler uses `Icon` prefix naming convention.

## Icon Mapping Table

| Lucide Name | Tabler Name | Used In |
|-------------|-------------|---------|
| `Eye` | `IconEye` | lock-screen, login-form, setup-password-form, register-form, password-field, share-link-result |
| `EyeOff` | `IconEyeOff` | lock-screen, login-form, setup-password-form, register-form, password-field |
| `Lock` | `IconLock` | vault-list, lock-screen, empty-vault |
| `ArrowLeft` | `IconArrowLeft` | folder-management, vault-item-detail, vault-item-form, share-page, import-passwords, export-vault, settings-page, security-health, share-link-result |
| `Plus` | `IconPlus` | folder-management, vault-list, empty-vault |
| `Trash2` | `IconTrash` | folder-management, vault-item-detail, disable-sync-modal |
| `Search` | `IconSearch` | search-bar |
| `X` | `IconX` | search-bar |
| `Copy` | `IconCopy` | copy-button, share-link-result, security-health |
| `Check` | `IconCheck` | copy-button, share-link-result |
| `Globe` | `IconWorld` | vault-item-card, vault-item-detail, share-page |
| `ExternalLink` | `IconExternalLink` | vault-item-card |
| `Pencil` | `IconPencil` | vault-item-detail |
| `Folder` | `IconFolder` | vault-item-detail, folder-management |
| `FolderOpen` | `IconFolderOpen` | vault-list, empty-vault |
| `PackageOpen` | `IconPackage` | empty-vault |
| `Settings` | `IconSettings` | vault-list, empty-vault |
| `RefreshCw` | `IconRefresh` | password-generator-view, vault-item-form, settings-page |
| `Sparkles` | `IconSparkles` | vault-item-form |
| `List` | `IconList` | folder-management |
| `UserPlus` | `IconUserPlus` | upgrade-account-modal |
| `ShieldCheck` | `IconShieldCheck` | upgrade-account-modal, app-header, enable-sync-modal |
| `ShieldAlert` | `IconShieldExclamation` | security-health |
| `WifiOff` | `IconWifiOff` | app-header |
| `Dices` | `IconDice` | bottom-nav |
| `LayoutGrid` | `IconLayoutGrid` | bottom-nav |
| `Share2` | `IconShare` | bottom-nav |
| `Shield` | `IconShield` | bottom-nav |
| `AlertTriangle` | `IconAlertTriangle` | share-options, export-vault |
| `Cloud` | `IconCloud` | enable-sync-modal, settings-page |
| `CloudOff` | `IconCloudOff` | disable-sync-modal |
| `Pause` | `IconPlayerPause` | disable-sync-modal |
| `Upload` | `IconUpload` | import-passwords, settings-page |
| `Download` | `IconDownload` | export-vault, settings-page |
| `Timer` | `IconClock` | settings-page, security-health |
| `Clipboard` | `IconClipboard` | settings-page |
| `User` | `IconUser` | settings-page |
| `LogOut` | `IconLogout` | settings-page |
| `Sun` | `IconSun` | settings-page |
| `Moon` | `IconMoon` | settings-page |
| `Monitor` | `IconDeviceDesktop` | settings-page |
| `Clock` | `IconClock` | settings-page, share-link-result |
| `Languages` | `IconLanguage` | settings-page |
| `CircleCheck` | `IconCircleCheck` | share-link-result |
| `ChevronRight` | `IconChevronRight` | security-health |

**Notes:**
- `Globe` → `IconWorld` (Tabler names it differently)
- `Dices` → `IconDice` (singular in Tabler)
- `PackageOpen` → `IconPackage` (no "Open" variant, verify visually)
- `Sparkles` → `IconSparkles` (verify exists, fallback: `IconStar`)
- `Timer` and `Clock` both → `IconClock` (deduplicate)

## Related Code Files

**26 files to modify** (all in `client/apps/extension/src/components/`):

### auth/
- `lock-screen.tsx`, `login-form.tsx`, `register-form.tsx`, `setup-password-form.tsx`, `upgrade-account-modal.tsx`

### vault/
- `vault-list.tsx`, `vault-item-card.tsx`, `vault-item-detail.tsx`, `vault-item-form.tsx`, `empty-vault.tsx`, `search-bar.tsx`, `folder-management.tsx`, `password-generator-view.tsx`

### common/
- `app-header.tsx`, `bottom-nav.tsx`, `copy-button.tsx`, `password-field.tsx`

### share/
- `share-page.tsx`, `share-options.tsx`, `share-link-result.tsx`

### settings/
- `settings-page.tsx`, `security-health.tsx`, `enable-sync-modal.tsx`, `disable-sync-modal.tsx`, `import-passwords.tsx`, `export-vault.tsx`

**Also modify:**
- `client/apps/extension/package.json` — add `@tabler/icons-react`, remove `lucide-react`

## Implementation Steps

1. Install: `pnpm --filter @vaultic/extension add @tabler/icons-react`
2. For each of 26 files:
   a. Replace `from 'lucide-react'` with `from '@tabler/icons-react'`
   b. Rename each icon per mapping table
   c. Update `strokeWidth={1.5}` → `stroke={1.5}` (Tabler prop name)
   d. Update `size={N}` → `size={N}` (same prop, compatible)
3. Remove lucide: `pnpm --filter @vaultic/extension remove lucide-react`
4. Update SVG strings in content scripts (`autofill-dropdown-styles.ts`, `autofill-icon.ts`) — these are inline SVGs, not React components. Convert to Tabler SVG paths.
5. Type check: `cd client && pnpm tsc --noEmit`
6. Visual test each screen

## Tabler Props vs Lucide Props

| Prop | Lucide | Tabler |
|------|--------|--------|
| Size | `size={20}` | `size={20}` ✓ same |
| Stroke | `strokeWidth={1.5}` | `stroke={1.5}` |
| Color | `color="red"` | `color="red"` ✓ same |
| Class | `className="x"` | `className="x"` ✓ same |

**Key difference:** `strokeWidth` → `stroke`

## Todo List

- [x] Install @tabler/icons-react
- [x] Migrate auth/ components (5 files)
- [x] Migrate vault/ components (7 files)
- [x] Migrate common/ components (4 files)
- [x] Migrate share/ components (3 files)
- [x] Migrate settings/ components (6 files)
- [x] Update inline SVGs in content scripts (2 files)
- [x] Remove lucide-react dependency
- [x] Type check passes
- [x] Visual verify all icons render

## Success Criteria

- Zero imports from `lucide-react`
- All 26 files use `@tabler/icons-react`
- `tsc --noEmit` passes
- All icons visually correct and consistent
- Content script inline SVGs updated
