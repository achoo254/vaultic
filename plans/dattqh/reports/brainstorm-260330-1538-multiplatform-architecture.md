# Brainstorm: Multi-Platform Architecture for Vaultic

**Date:** 2026-03-30
**Status:** Approved (architecture only, no implementation yet)
**Goal:** Future-proof architecture for desktop app, mobile app, and web vault

---

## Problem Statement

Vaultic is currently extension-only (Chrome MV3). Need architecture that enables desktop, mobile, and web apps while maximizing code reuse (80%+ UI) and maintaining zero-knowledge encryption.

## Current State

**Already platform-agnostic:**
- `@vaultic/crypto` — WebCrypto + hash-wasm
- `@vaultic/sync` — DI pattern (VaultStore, SyncQueue, SyncApiAdapter, ConflictResolver)
- `@vaultic/api` — ofetch (universal fetch)
- `@vaultic/storage` — `VaultStore` interface (IndexedDB = 1 implementation)
- `@vaultic/types` — pure TypeScript

**Platform-specific (needs abstraction):**
- `chrome.storage.session` — encryption key lifecycle
- `chrome.storage.local` — tokens, config
- `chrome.alarms` — background sync, auto-lock
- Content script / auto-fill — DOM injection
- Device ID — localStorage fallback

---

## Framework Recommendations

### Desktop: Tauri 2.x (Recommended)

| Pro | Con |
|-----|-----|
| ~5-10MB bundle (vs Electron ~150MB) | Rust required for platform plugins |
| WebCrypto native in WebView | Plugin ecosystem younger than Electron |
| React reuse 100% | WebView2 (Win) vs WebKit (Mac/Linux) differences |
| Stronger security model | |
| OS keychain access via plugin | |

### Mobile: Capacitor (Recommended)

| Pro | Con |
|-----|-----|
| ~90% UI reuse (same React in WebView) | WebView performance < native rendering |
| WebCrypto native | Less "native feel" than RN |
| IndexedDB works out of box | Background task limitations on iOS |
| Same web stack, low learning curve | |

---

## 7-Layer Architecture

```
Layer 7: Platform Shell
  Extension popup / Tauri window / Capacitor app / Web SPA

Layer 6: UI Components (shared 80%+)
  @vaultic/ui — React + shadcn/ui + design tokens

Layer 5: State Management (shared)
  @vaultic/stores — Zustand (auth, vault, settings)

Layer 4: Platform Adapter Interface (NEW)
  @vaultic/platform-core — SessionStore, Scheduler, AutoFill, DeviceId

Layer 3: Business Logic (shared)
  @vaultic/crypto, @vaultic/sync

Layer 2: Data Access (interface + implementations)
  @vaultic/storage — VaultStore, SyncQueue
  Impl: IndexedDB | SQLite | Memory

Layer 1: Transport (shared)
  @vaultic/api → Backend (Express)
```

---

## Platform Adapter Interfaces

### PlatformAdapter (root)

```typescript
interface PlatformAdapter {
  readonly platform: 'extension' | 'desktop' | 'mobile' | 'web';
  session: SessionStore;
  scheduler: BackgroundScheduler;
  deviceId: DeviceIdProvider;
  clipboard: ClipboardManager;
  biometric?: BiometricProvider;
  autofill?: AutoFillProvider;
}
```

### SessionStore

```typescript
interface SessionStore {
  setEncryptionKey(key: Uint8Array): Promise<void>;
  getEncryptionKey(): Promise<Uint8Array | null>;
  clearEncryptionKey(): Promise<void>;
  onEncryptionKeyCleared(cb: () => void): () => void;
  setTokens(access: string, refresh: string): Promise<void>;
  getTokens(): Promise<{ access: string; refresh: string } | null>;
  clearTokens(): Promise<void>;
  setVaultConfig(config: VaultConfig): Promise<void>;
  getVaultConfig(): Promise<VaultConfig | null>;
}
```

**Implementations per platform:**

| Platform | Encryption Key | Tokens/Config |
|----------|---------------|---------------|
| Extension | `chrome.storage.session` | `chrome.storage.local` |
| Tauri | OS Keychain (session) | `tauri-plugin-store` |
| Capacitor | Keychain/Keystore | `@capacitor/preferences` |
| Web | `sessionStorage` | `localStorage` |

### BackgroundScheduler

```typescript
interface BackgroundScheduler {
  scheduleAlarm(name: string, delayMs: number): Promise<void>;
  scheduleRepeating(name: string, intervalMs: number): Promise<void>;
  cancelAlarm(name: string): Promise<void>;
  onAlarm(name: string, cb: () => void): () => void;
}
```

### Other Adapters

- `DeviceIdProvider` — `getDeviceId(): Promise<string>`
- `ClipboardManager` — `write(text)` + `scheduleAutoClear(delayMs)`
- `AutoFillProvider` — extension content script / mobile OS Autofill API
- `BiometricProvider` — mobile only (Face ID, fingerprint)
- `StorageFactory` — creates `VaultStore` + `SyncQueue` per platform

---

## Package Restructure

```
client/
├── packages/
│   ├── crypto/          # Unchanged (universal)
│   ├── sync/            # Unchanged (DI pattern)
│   ├── api/             # Unchanged (ofetch)
│   ├── storage/         # Add SQLiteStore implementation
│   ├── ui/              # Expand shared components
│   ├── platform-core/   # NEW: adapter interfaces
│   └── stores/          # NEW: extracted from extension
├── apps/
│   ├── extension/       # + ChromeAdapter
│   ├── desktop/         # NEW: Tauri + TauriAdapter
│   ├── mobile/          # NEW: Capacitor + CapacitorAdapter
│   └── web/             # FUTURE: WebAdapter
```

---

## Migration Path

### Phase 0: Extract Abstractions (before any new app)
1. Create `@vaultic/platform-core` — interfaces only
2. Create `ChromeAdapter` in extension (wraps chrome.* APIs)
3. Extract Zustand stores to `@vaultic/stores` (inject PlatformAdapter via Context)
4. Verify extension works identically after refactor

### Phase 1: Desktop (Tauri)
5. Scaffold Tauri app in `client/apps/desktop/`
6. Implement `TauriAdapter` (keychain, SQLite, system tray)
7. Import shared stores + UI components
8. Desktop-specific: window chrome, keyboard shortcuts

### Phase 2: Mobile (Capacitor)
9. Scaffold Capacitor app in `client/apps/mobile/`
10. Implement `CapacitorAdapter` (biometric, secure storage)
11. Responsive layout adjustments
12. OS Autofill integration (Android/iOS)

### Phase 3: Web Vault (Optional)
13. Scaffold web app (Vite + React)
14. Implement `WebAdapter` (session-only keys)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebCrypto behavior differs across WebView engines | Crypto bugs | Test crypto on each WebView engine |
| SQLite ↔ IndexedDB schema mismatch | Data format issues | Shared VaultItem type + version field |
| Tauri plugin ecosystem maturity | Missing features | Custom Rust plugins as fallback |
| Capacitor WebView perf on low-end Android | Slow UI | Virtual list + lazy loading |
| Store extraction breaks extension | Regression | Full test suite before extract |

---

## Success Criteria

- [ ] PlatformAdapter interface covers all extension chrome.* usage
- [ ] Extension works identically after Phase 0 refactor
- [ ] Desktop app shares 80%+ UI code with extension
- [ ] Mobile app shares 80%+ UI code
- [ ] Crypto tests pass on all target WebView engines
- [ ] Sync works across extension + desktop + mobile simultaneously

---

## Validation Summary

**Validated:** 2026-03-30
**Questions asked:** 6

### Confirmed Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Storage strategy | Per-platform (Extension=IndexedDB, Desktop=SQLite, Mobile=SQLite) | Each platform uses its best-fit storage. No fallback needed. |
| 2 | DI pattern for PlatformAdapter | React Context | PlatformProvider wraps app root, `usePlatform()` hook. Clean, testable, SSR-safe. |
| 3 | Data migration cross-platform | Cloud Sync handles it | User enables sync on both devices, data auto-syncs. No separate migration tool. |
| 4 | Phase 0 rollback strategy | Incremental commits | Commit each adapter one-by-one, test after each. Revert individual parts if needed. |
| 5 | BiometricProvider design | Separate interface (optional) | Separation of concerns. SessionStore = key storage only. Biometric = auth method. |
| 6 | Responsive UI strategy | Responsive from the start | Refactor @vaultic/ui to responsive. Extension wraps in 380x520 container. Desktop/mobile full-size. |

### Action Items (when implementing)

- [ ] Update PlatformAdapter interface: add `StorageFactory` that returns platform-appropriate `VaultStore` impl
- [ ] Design `PlatformProvider` React Context + `usePlatform()` hook in `@vaultic/platform-core`
- [ ] Keep `BiometricProvider` as optional interface, only implement in Phase 2 (mobile)
- [ ] Refactor `@vaultic/ui` components to be responsive before extracting stores
- [ ] Phase 0 commits: (1) platform-core interfaces → (2) ChromeSessionStore → (3) ChromeScheduler → (4) extract stores → (5) verify extension

### Implications for Plan

- **No plan changes needed** — all decisions align with proposed architecture
- **Clarification added:** Storage is per-platform, not SQLite everywhere
- **Clarification added:** Biometric deferred to Phase 2, interface-only in Phase 0
- **Clarification added:** Responsive UI refactor is part of Phase 0 (before store extraction)

---

## Next Steps

When ready to implement, start with **Phase 0** (extract abstractions). This is the foundation — all other phases depend on it. Run `/plan` with this report as context.
