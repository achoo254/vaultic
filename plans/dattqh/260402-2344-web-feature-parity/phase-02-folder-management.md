---
phase: 2
title: Folder Management
status: pending
effort: medium
---

# Phase 2: Folder Management

## Overview
Add folder CRUD + filtering to web vault page. Port FolderBar (87 lines) + FolderSelect (60 lines) from extension. Folder management via modal (not separate page).

## Context
- Extension refs:
  - `client/apps/extension/src/components/vault/folder-bar.tsx`
  - `client/apps/extension/src/components/vault/folder-select.tsx`
  - `client/apps/extension/src/components/vault/folder-management.tsx`
- Web vault store already has: `folders`, `selectedFolder`, `setSelectedFolder`, `addFolder`, `deleteFolder`
- `useFilteredItems()` already filters by `selectedFolder`

## Changes

### 1. Create `components/folder-bar.tsx`
Port from extension:
- Horizontal scrollable chip bar below search
- "All Items" chip (always first, shows total count)
- Folder chips: `{name} ({itemCount})`
- Active chip styled with `primaryBg` + `primary` color
- Settings gear button at end → opens folder management modal
- Click chip → `setSelectedFolder(id)` or `null` for "All"

### 2. Create `components/folder-select.tsx`
Port from extension:
- Native `<select>` dropdown
- Label "Folder" above
- Options: "No Folder" (empty) + folder list
- Props: `value: string | undefined`, `onChange: (folderId: string | undefined) => void`
- Early return null if no folders exist

### 3. Update `pages/vault-page.tsx`
- Import and add `<FolderBar />` between search bar and vault items list
- Add folder management modal (inline, triggered by FolderBar gear button)
  - State: `showFolderModal`, `newFolderName`, `adding`, `deleteTarget`
  - Folder list with item counts
  - Inline add input (Enter to create, Escape to cancel)
  - Delete with Modal confirmation
  - Duplicate name validation
- Add `<FolderSelect />` to VaultItemFormModal
  - Add `folderId` state to form
  - Pass `folderId` to `addItem()` / `updateItem()`
  - Pre-populate from `editItem.folder_id`

### 4. Wire folder_id in vault item form
Current VaultItemFormModal missing folder support:
```typescript
// Add state
const [folderId, setFolderId] = useState<string | undefined>(undefined);

// In useEffect (edit mode)
if (item) setFolderId(item.folder_id);

// In onSave call
await onSave(credential, folderId);

// Update onSave prop type to include folderId
```

## Files
| Action | File |
|--------|------|
| CREATE | `client/apps/web/src/components/folder-bar.tsx` |
| CREATE | `client/apps/web/src/components/folder-select.tsx` |
| UPDATE | `client/apps/web/src/pages/vault-page.tsx` |

## Success Criteria
- [ ] Folder bar shows below search when folders exist
- [ ] Click folder chip filters vault items
- [ ] "All Items" shows all items
- [ ] Gear button opens folder management modal
- [ ] Can create folder with name validation (no duplicates)
- [ ] Can delete folder (items move to "No Folder")
- [ ] FolderSelect dropdown in add/edit item form
- [ ] folder_id saved correctly on item create/update
- [ ] `tsc --noEmit` passes
