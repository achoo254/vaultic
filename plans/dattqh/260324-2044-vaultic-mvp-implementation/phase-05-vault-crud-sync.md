---
phase: 5
priority: high
status: pending
estimated_days: 5
depends_on: [4]
---

# Phase 5: Vault CRUD & Sync

## Overview
**Offline-first** vault management: ALL CRUD operations happen locally in IndexedDB. Sync engine pushes/pulls encrypted blobs to server when online. Extension works 100% offline after first login.

## Architecture

Extension is a **thin UI layer**. Business logic lives in shared packages.

```
packages/extension/src/                    # UI only
├── components/
│   ├── vault/
│   │   ├── VaultList.tsx                  # Main vault view with sections
│   │   ├── VaultItem.tsx                  # Single item card
│   │   ├── VaultItemForm.tsx              # Add/edit credential form
│   │   ├── VaultItemDetail.tsx            # View credential details
│   │   ├── FolderList.tsx                 # Folder sidebar/section
│   │   └── SearchBar.tsx                  # Fuzzy search input
│   └── common/
│       ├── PasswordField.tsx              # Show/hide password + copy
│       └── CopyButton.tsx                 # Copy to clipboard + auto-clear
├── stores/
│   ├── vault-store.ts                     # Zustand: UI state, delegates to packages
│   └── sync-store.ts                      # Zustand: sync state + online status
├── hooks/
│   ├── use-vault.ts                       # Wraps vault-store + crypto + storage
│   └── use-sync.ts                        # Wraps sync-store + sync engine
│
│── Imports from shared packages:
│   @vaultic/types    → VaultItem, Folder, ItemType
│   @vaultic/crypto   → encrypt, decrypt (vault items)
│   @vaultic/storage  → IndexedDBVaultStore, SyncQueue
│   @vaultic/sync     → SyncEngine, LWWResolver
│   @vaultic/api      → syncApi.push, syncApi.pull
│   @vaultic/ui       → shared components
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

### 1. Vault crypto helpers — uses @vaultic/crypto (2h)
```typescript
// packages/extension/src/hooks/use-vault.ts
import { encrypt, decrypt } from '@vaultic/crypto';
import type { VaultItemPlaintext } from '@vaultic/types';

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
  // Actions — ALL operate on local IndexedDB first
  loadVault: () => Promise<void>;        // Read from IndexedDB
  addItem: (item: VaultItemPlaintext, folderId?: string) => Promise<void>;   // IndexedDB + sync_queue
  updateItem: (id: string, item: VaultItemPlaintext) => Promise<void>;       // IndexedDB + sync_queue
  deleteItem: (id: string) => Promise<void>;  // IndexedDB soft delete + sync_queue
  search: (query: string) => void;       // Search decrypted cache (local only)
}
```

**Key change**: Every CRUD action writes to IndexedDB immediately (instant UX), then adds entry to `sync_queue`. Sync engine processes queue when online.

### 3. Implement packages/sync — SyncEngine (4h)
```typescript
// packages/sync/src/sync-engine.ts
import type { VaultStore, SyncQueue } from '@vaultic/storage';
import type { SyncApi } from '@vaultic/api';
import type { ConflictResolver } from './conflict-resolver';

export class SyncEngine {
  constructor(
    private store: VaultStore,
    private queue: SyncQueue,
    private api: SyncApi,
    private resolver: ConflictResolver,
    private getDeviceId: () => Promise<string>,
  ) {}

  async sync(): Promise<SyncResult> {
    if (!navigator.onLine) return { status: 'offline' };

    // 1. Push local changes
    const pending = await this.queue.dequeueAll();
    if (pending.length > 0) {
      const result = await this.api.push({
        items: pending.filter(c => c.type === 'item'),
        folders: pending.filter(c => c.type === 'folder'),
        device_id: await this.getDeviceId(),
      });
      await this.queue.clear(result.accepted);
    }

    // 2. Pull remote changes
    const lastSync = await this.store.getMetadata('last_sync');
    const delta = await this.api.pull(lastSync, await this.getDeviceId());

    for (const item of delta.items) {
      const local = await this.store.getItem(item.id);
      const resolved = local ? this.resolver.resolve(local, item) : item;
      await this.store.putItem(resolved);
    }
    for (const id of delta.deleted_ids) {
      await this.store.deleteItem(id);
    }

    await this.store.setMetadata('last_sync', delta.server_time);
    return { status: 'synced', pushed: pending.length, pulled: delta.items.length };
  }
}
```

**Sync is USER-CONTROLLED (opt-in):**
- Default: Cloud Sync OFF → no sync, all data local only
- User enables in Settings → sync starts
- Sync triggers (only when Cloud Sync = ON):
  - On toggle ON (first time: full push)
  - After local CRUD → add to sync_queue → push if online
  - Periodic background sync (every 5min via alarm)
  - On extension popup open
  - Manual "Sync Now" button in Settings
- User disables Cloud Sync → stop syncing, option to purge server data
- Share works independently (one-time upload, no sync required)

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

## Design Verification Checklists

### Screen 04: Empty Vault
**Reference:** system-design.pen > Screen 04
- [ ] Center icon + "Your vault is empty" text
- [ ] "Add your first credential" CTA button
- [ ] Bottom nav: 4 icons visible
- [ ] Screenshot comparison: ≥90% PASS

### Screen 05: Vault List
**Reference:** system-design.pen > Screen 05
- [ ] Search bar at top with magnifier icon
- [ ] "Suggested" section: items matching current URL
- [ ] "Recent" section: last 5 items
- [ ] Each item card: favicon/icon + name + email/username + copy/eye/link icons
- [ ] Bottom nav: Vault (active, blue), Generator, Share, Settings
- [ ] Scroll behavior for long lists
- [ ] Screenshot comparison: ≥90% PASS

### Screen 06: Credential Detail
**Reference:** system-design.pen > Screen 06
- [ ] Header: back arrow + site name + edit/share/delete icons
- [ ] Site icon badge (colored) + name + URL
- [ ] USERNAME row: label + value + copy icon
- [ ] PASSWORD row: label + masked dots + eye toggle + copy icon
- [ ] NOTES section
- [ ] Folder + last modified display
- [ ] Screenshot comparison: ≥90% PASS

### Screen 07: Add/Edit Credential
**Reference:** system-design.pen > Screen 07
- [ ] Header: back arrow + "Add Credential" / "Edit"
- [ ] Fields: name, URL, username, password (with generate button), notes
- [ ] Folder dropdown selector
- [ ] Save button: full width, primary
- [ ] Inline password generator icon
- [ ] Screenshot comparison: ≥90% PASS

### Screen 08: Delete Confirmation
**Reference:** system-design.pen > Screen 08
- [ ] Modal overlay with dimmed background
- [ ] Trash icon + "Delete Credential?" title
- [ ] Warning text
- [ ] Cancel (secondary) + Delete (red) buttons
- [ ] Screenshot comparison: ≥90% PASS

### Screen 09: Password Generator
**Reference:** system-design.pen > Screen 09
- [ ] Generated password display + copy + regenerate
- [ ] Strength indicator bar with color
- [ ] Length slider (8-64)
- [ ] Toggle switches: uppercase, lowercase, numbers, symbols
- [ ] "Use this password" button
- [ ] Screenshot comparison: ≥90% PASS

### Screen 22: Folder Management
**Reference:** system-design.pen > Screen 22
- [ ] Header: back + "Folders" + add icon
- [ ] "All Items" with total count
- [ ] User folders with item counts
- [ ] Selected folder highlighted blue
- [ ] Context menu (⋮): rename, delete
- [ ] Screenshot comparison: ≥90% PASS

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
- **CRUD works 100% offline**: create/edit/delete vault items in IndexedDB without network
- Changes queued in sync_queue → pushed to server when online
- Sync pulls remote changes from other devices correctly
- LWW conflict resolution works (latest updated_at wins)
- Search finds items by name/URL instantly (from decrypted cache)
- "Suggested" section correctly matches current tab URL
- Folder organization works (create, move items) — all local
- Clipboard auto-clears after 30s
- All data in IndexedDB is encrypted (ciphertext blobs only)
- Reconnect after offline → auto-sync pending changes
