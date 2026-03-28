# Vaultic Extension: Auth & Share Implementation Analysis

Date: 2026-03-28 | Duration: Medium Exploration
Work Context: D:/CONG VIEC/vaultic

## 1. AUTH STORE (auth-store.ts)

File: client/apps/extension/src/stores/auth-store.ts | Lines: 174

Key Methods & Network Requirements:
- register(): YES network - Argon2id hash to server + auto-login
- login(): YES network - Derive keys → POST /api/auth/login  
- unlock(): NO network - Local Argon2 → verify against stored hash
- lock(): NO network - Clear enc_key from session
- logout(): NO network - Clear all storage
- hydrate(): NO network - Restore state from persistent storage

Storage Strategy:
- Session (chrome.storage.session): enc_key → cleared on browser close
- Local (chrome.storage.local): JWT tokens, user info, auth_hash_verifier

Unlock Flow (Offline-First Working):
Derives password → compares with stored auth hash → unlocks if match

Offline-First Gaps:
1. Register needs local account first, sync later
2. Login needs fallback using stored auth hash
3. Session key lost on browser restart (need fallback storage)

## 2. VAULT STORE (vault-store.ts)

File: client/apps/extension/src/stores/vault-store.ts | Lines: 255

Operations (Write-First Pattern):
- addItem: Encrypt → IndexedDB → enqueue sync → UI update
- updateItem: Re-encrypt → IndexedDB → enqueue sync → UI update
- deleteItem: Soft-delete → IndexedDB → enqueue sync
- loadVault: Decrypts all items in-memory from IndexedDB

Offline-First Status:
GOOD: Already write-first (IndexedDB immediately updated)
MISSING: No conflict resolution for diverged states
MISSING: No retry logic or incremental sync pull
MISSING: loadVault() assumes clean state

## 3. STORAGE (storage/src/)

Files: indexeddb-store.ts (100 lines), indexeddb-sync-queue.ts (52 lines)

VaultStore Interface:
- getItem(id) / putItem(item)
- getAllItems() / getChangedSince(timestamp)
- getFolder(id) / putFolder(folder) / getAllFolders()

IndexedDB Schema:
- Database: vaultic
- Stores: items, folders, meta
- Soft-delete: deleted_at flag on items
- Metadata: Stores sync cursor (prepared but unused)

Offline-First Gaps:
1. No version+server_updated_at for conflict tracking
2. No sync queue cleanup/compaction
3. getMetadata/setMetadata exists but unused

## 4. CRYPTO

KDF (kdf.ts - 114 lines):
- deriveMasterKey(password, email) → Argon2id (m=65536, t=3, p=4)
- deriveEncryptionKey(masterKey) → HKDF-SHA256 → AES-256-GCM
- deriveAuthHash(masterKey) → HKDF-SHA256 → SHA256

Cipher (cipher.ts - 101 lines):
- encrypt(key, plaintext) → base64(nonce || ciphertext)
- decrypt(key, encryptedData) → plaintext

Status: PURE CRYPTO - no network dependency, offline-ready

## 5. SHARE MECHANISM

Frontend (share-page.tsx - 131 lines):

Two Modes:
1. From Vault: Select item → choose fields → encrypt → POST /api/share
2. Quick Share: Paste text → encrypt → POST /api/share

Security: keyFragment stays in URL hash, never sent to server

Backend (share-page.html - 209 lines):

Public Endpoint: /s/{share_id}

Three Views:
1. Loading → Fetch metadata (no view count increment)
2. Prompt → Show expiry/view warning
3. Revealed → Decrypt in-browser → Display result

Endpoints:
- /api/share/{id}/meta: Returns max_views, current_views, expires_at (NO increment)
- /api/share/{id}: Returns encrypted_data (DOES increment view)

Offline-First Gaps:
1. Share creation needs offline queue if no network
2. View counting relies on server (no fallback)
3. Expiry validation trusts server

## 6. POPUP ROUTING (app.tsx - 162 lines)

View State Machine:
- Auth: loading, register, login, locked
- Vault: vault-list, vault-detail, vault-add, vault-edit
- Other: generator, share, settings, export, import, health

Status:
GOOD: Share page accessible when unlocked
GOOD: Vault list fully offline (IndexedDB)
MISSING: No sync status indicator
MISSING: No conflict resolution UI

## 7. AUTH FORMS

LoginForm (155 lines):
- Email + password input
- Network-required (calls useAuthStore.login())
- Sets isLoggedIn=true, isLocked=false

RegisterForm (143 lines):
- Email + password + confirm  
- Password strength meter
- Network-required, auto-logs in after

LockScreen (137 lines):
- FULLY OFFLINE: Re-derives hash locally, compares with stored
- Shows email from auth store
- Logout button

## 8. SESSION STORAGE (lib/session-storage.ts - 101 lines)

Encryption Key (Session Only):
- storeEncryptionKey(key) → chrome.storage.session
- getEncryptionKey() → CryptoKey | null
- Cleared on browser close

JWT + User Info (Persistent):
- storeTokens(accessToken, refreshToken) → local
- getTokens() → { accessToken, refreshToken } | null
- storeUserInfo(email, userId) → local
- getUserInfo() → { email, userId } | null

Auth Hash Verifier (Persistent):
- storeAuthHashVerifier(hash) → local
- getAuthHashVerifier() → hash | null (used for offline unlock)

## 9. CURRENT OFFLINE-FIRST STATUS

WORKING OFFLINE:
✓ Unlock vault (Argon2 locally, hash comparison)
✓ Vault operations (all IndexedDB)
✓ Share encryption (client-side AES-256-GCM)
✓ Share decryption (browser-side)
✓ Password generator (pure JS)
✓ Settings (export/import)

REQUIRES NETWORK:
✗ Register account
✗ Login (first time)
✗ Share link generation (POST to /api/share)
✗ Share view counting (server increments)
✗ Token refresh
✗ Metadata sync (no incremental pull)

MISSING FEATURES:
✗ Conflict resolution (no merge logic)
✗ Sync progress UI (no pending indicator)
✗ Offline registration queue
✗ Session key fallback
✗ Device ID management
✗ Multi-device sync coordination

## 10. FILE SUMMARY

File | Lines | Offline-Ready | Network Deps
-----|-------|---------------|----------
auth-store.ts | 174 | Partial | register, login
vault-store.ts | 255 | YES | sync endpoint
indexeddb-store.ts | 100 | YES | none
indexeddb-sync-queue.ts | 52 | YES | none  
kdf.ts | 114 | YES | none
cipher.ts | 101 | YES | none
share-crypto.ts | 63 | YES | none
share-page.tsx | 131 | Partial | /api/share
share-page.html | 209 | YES | metadata
login-form.tsx | 155 | NO | /api/auth/login
register-form.tsx | 143 | NO | /api/auth/register
lock-screen.tsx | 137 | YES | none
app.tsx | 162 | YES | auth gates

## 11. UNRESOLVED QUESTIONS

1. How are device IDs assigned for multi-device sync? (Currently device_id="")
2. What happens to nested folders on parent deletion?
3. Is auth_hash_verifier in local storage acceptable risk?
4. How to prevent replay attacks on share links with URL fragments?
5. Are Argon2 parameters hardcoded or server-mutable?
6. Why getMetadata/setMetadata in IndexedDB but unused?
7. Where is token refresh logic?
8. Is service worker handling background sync?
