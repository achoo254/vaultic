---
phase: 5
priority: high
status: pending
estimated_days: 5
depends_on: [4]
---

# Phase 5: Vault CRUD & Sync

## Overview
Vault management in extension popup: create/edit/delete credentials, folder organization, search, sync with server. All data encrypted client-side.

## Architecture

```
packages/extension/src/
├── components/
│   ├── vault/
│   │   ├── VaultList.tsx        # Main vault view with sections
│   │   ├── VaultItem.tsx        # Single item card (name, URL, actions)
│   │   ├── VaultItemForm.tsx    # Add/edit credential form
│   │   ├── VaultItemDetail.tsx  # View credential details
│   │   ├── FolderList.tsx       # Folder sidebar/section
│   │   └── SearchBar.tsx        # Fuzzy search input
│   └── common/
│       ├── PasswordField.tsx    # Show/hide password + copy
│       └── CopyButton.tsx       # Copy to clipboard + auto-clear
├── stores/
│   ├── vault-store.ts           # Zustand: vault items + folders
│   └── sync-store.ts            # Zustand: sync state + last_sync
├── lib/
│   ├── vault-crypto.ts          # Encrypt/decrypt vault items
│   └── sync-engine.ts           # Sync logic (pull delta, merge)
└── types/
    └── vault.ts                 # VaultItem, Folder, ItemType
```

## Data Types

```typescript
enum ItemType { Login = 1, SecureNote = 2, Card = 3, Identity = 4 }

interface VaultItemPlaintext {
  name: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  tags?: string[];
}

interface VaultItemEncrypted {
  id: string;
  folder_id?: string;
  item_type: ItemType;
  encrypted_data: string;  // base64(nonce + ciphertext)
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  encrypted_name: string;  // base64(nonce + ciphertext)
  parent_id?: string;
}
```

## Implementation Steps

### 1. Vault crypto helpers — vault-crypto.ts (2h)
```typescript
export async function encryptVaultItem(key: CryptoKey, item: VaultItemPlaintext): Promise<string> {
  const json = JSON.stringify(item);
  const encrypted = await encrypt(key, new TextEncoder().encode(json));
  return btoa(String.fromCharCode(...encrypted));
}

export async function decryptVaultItem(key: CryptoKey, encryptedData: string): Promise<VaultItemPlaintext> {
  const bytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const decrypted = await decrypt(key, bytes);
  return JSON.parse(new TextDecoder().decode(decrypted));
}
```

### 2. Vault store — vault-store.ts (3h)
```typescript
interface VaultState {
  items: VaultItemEncrypted[];
  decryptedCache: Map<string, VaultItemPlaintext>; // in-memory only
  folders: Folder[];
  searchQuery: string;
  selectedFolder: string | null;
  // Actions
  loadVault: () => Promise<void>;
  addItem: (item: VaultItemPlaintext, folderId?: string) => Promise<void>;
  updateItem: (id: string, item: VaultItemPlaintext) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  search: (query: string) => void;
}
```

### 3. Sync engine — sync-engine.ts (4h)
```typescript
export async function syncVault() {
  const lastSync = await getLastSyncTimestamp();
  const delta = await api.sync(lastSync);

  // Merge server changes into local
  for (const item of delta.items) {
    await localDb.upsert('vault_items', item);
  }
  for (const id of delta.deleted_ids) {
    await localDb.delete('vault_items', id);
  }

  await setLastSyncTimestamp(new Date().toISOString());
}
```

Sync triggers:
- On unlock (pull latest)
- After each local CRUD operation (push + pull)
- Periodic background sync (every 5min via alarm)
- On extension popup open

### 4. VaultList component (3h)
Sections:
1. **Suggested (this site)** — match current tab URL against vault items
2. **Recent** — last 5 accessed items
3. **All Items** — grouped by folder or flat list
4. Search bar — fuzzy match on decrypted name/URL

```typescript
// Get current tab URL for context-aware suggestions
const [currentUrl, setCurrentUrl] = useState('');
useEffect(() => {
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => setCurrentUrl(new URL(tabs[0].url).hostname));
}, []);
```

### 5. EmptyVault component (1h) — **Screen 04**
- Shown when vault has 0 items after first login
- Center icon + "Your vault is empty" + "Add your first credential" CTA
- CTA navigates to Add Credential form

### 6. VaultList inline actions (2h) — **Screen 05**
Per vault item card: inline copy password + external link + eye toggle
- Suggested card: shows password dots (••••••••), copy/eye/external-link icons
- Recent items: copy + external-link icons (no chevron)
- Click item body → navigate to Screen 06 Detail
- Click copy → copy password to clipboard + auto-clear 30s
- Click external-link → open URL in new tab

### 7. VaultItemForm component (3h) — **Screen 07**
- Fields: name, URL, username, password, notes, folder, tags
- Inline password generator button (sparkles icon + "Generate" text)
- Folder dropdown selector
- Save: encrypt → API POST → sync
- Edit: decrypt existing → show form → encrypt → API PUT

### 8. VaultItemDetail component (2h) — **Screen 06**
- Header: back arrow + site name + edit/share/delete icons
- Icon badge (colored) + site name + URL
- USERNAME row: label + value + copy icon
- PASSWORD row: label + masked dots + eye toggle + copy icon
- NOTES section: multiline text
- Folder display + last modified timestamp
- Edit icon → Screen 07 (pre-filled)
- Share icon → Screen 13 Secure Share
- Delete icon → Screen 08 Delete Confirmation modal

### 9. DeleteConfirmation modal (1h) — **Screen 08**
- Overlay dialog: trash icon, "Delete Credential?" title
- Warning text: "This action cannot be undone..."
- Cancel + Delete (red) buttons
- Delete → soft delete → sync → navigate back to vault list

### 10. PasswordGenerator component (2h) — **Screen 09**
- Standalone tab in popup bottom nav
- Generated password display + copy + regenerate
- Strength indicator bar (weak/medium/strong)
- Length slider (8-64)
- Toggle: uppercase, lowercase, numbers, symbols
- "Use this password" → fill active form field or copy

### 11. FolderManagement component (2h) — **Screen 22**
- Full screen: header with back + "Folders" + add icon
- List: All Items (total count) + user folders with item counts
- Selected folder highlighted blue
- Inline rename: tap folder → edit input + Save button
- Context menu (⋮): rename, delete folder
- Folder names encrypted (same as vault items)
- Move items between folders via dropdown in VaultItemForm

### 12. Clipboard management (1h)
```typescript
export async function copyToClipboard(text: string, clearAfterMs = 30000) {
  await navigator.clipboard.writeText(text);
  setTimeout(() => navigator.clipboard.writeText(''), clearAfterMs);
}
```

## Todo List
- [ ] VaultItemPlaintext / VaultItemEncrypted types
- [ ] vault-crypto.ts: encrypt/decrypt vault items
- [ ] vault-store.ts: Zustand store with CRUD actions
- [ ] sync-engine.ts: delta sync logic
- [ ] Background sync alarm (every 5min)
- [ ] EmptyVault component (Screen 04)
- [ ] VaultList with Suggested/Recent/All sections (Screen 05)
- [ ] SearchBar with fuzzy search
- [ ] VaultItemDetail (Screen 06)
- [ ] VaultItemForm add/edit (Screen 07)
- [ ] DeleteConfirmation modal (Screen 08)
- [ ] PasswordGenerator component (Screen 09)
- [ ] FolderManagement full screen (Screen 22)
- [ ] PasswordField (show/hide + copy)
- [ ] Clipboard auto-clear after 30s
- [ ] Context-aware suggestions (match current tab URL)

## Success Criteria
- Create/edit/delete vault items works end-to-end (client encrypt → server → sync back)
- Search finds items by name/URL instantly
- "Suggested" section correctly matches current tab URL
- Folder organization works (create, move items)
- Sync pulls new items from server on unlock
- Clipboard auto-clears after 30s
- All data in chrome.storage.local is encrypted
