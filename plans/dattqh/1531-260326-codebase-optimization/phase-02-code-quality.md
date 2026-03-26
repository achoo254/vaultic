---
phase: 2
title: Code Quality Refactoring
priority: P1
effort: ~1-2h
status: pending
---

# Phase 2: Code Quality

## Overview
Refactor large files under 200 lines, implement pending TODOs, improve maintainability.

## Related Files
- `packages/extension/src/entrypoints/background.ts` (218L)
- `packages/extension/src/components/auth/register-form.tsx` (215L)
- `crates/vaultic-server/src/services/sync_service.rs` (204L)
- `packages/extension/src/components/settings/settings-page.tsx` (162L — has TODOs)

## Implementation Steps

### 2.1 Refactor background.ts (218L → ~60L + modules)
**Current:** Single file with message router, credential matching, auto-lock, clipboard clear.

**Extract into:**
- `background.ts` — main orchestrator (~60L): setup listeners, import handlers
- `handlers/credential-handler.ts` — `getMatchingCredentials()`, `handleCapturedCredential()`, `saveCredential()`
- `handlers/auto-lock-handler.ts` — `initAutoLock()`
- `handlers/clipboard-handler.ts` — `scheduleClipboardClear()`, `clearClipboardViaTab()`
- `utils/crypto-helpers.ts` — `getEncKey()`, `extractDomain()`

**Key:** Keep `handleMessage()` switch in background.ts as the router. Functions move to handlers.

### 2.2 Refactor register-form.tsx (215L)
**Analysis:** 124L component + 91L style constants. The component itself is under 200L.

**Options:**
- **Option A (Recommended):** Extract style constants to `register-form.styles.ts` (~91L). Component stays at ~124L.
- **Option B:** Extract `getPasswordStrength()` + strength bar to `password-strength-indicator.tsx`. Component drops to ~180L.

Go with Option A — cleanest separation, no logic change.

### 2.3 Refactor sync_service.rs (204L)
**Analysis:** 3 public functions: `push` (118L), `pull` (69L), `purge` (13L). File is 204L — barely over.

**Decision:** Keep as-is. The 3 functions are logically cohesive (sync domain). Splitting into 3 files adds navigation overhead for minimal gain. Only refactor if file grows further.

**Alternative if strict:** Extract `push` into `sync_push.rs`, `pull` into `sync_pull.rs`. But YAGNI applies here.

### 2.4 Implement TODOs in settings-page.tsx
**Line 39:** `// TODO: trigger full vault push`
**Line 49:** `// TODO: call DELETE /api/sync/purge`

Server endpoints confirmed:
- `POST /api/sync/push` — exists in `handlers/sync.rs`
- `DELETE /api/sync/purge` — exists at `router.rs:20`

**Implementation:**

```typescript
// Line 39 — replace TODO with:
import { apiClient } from '@vaultic/api';
// Inside handleSyncToggle, after saveSetting:
const store = new IndexedDBStore();
const items = await store.getAllItems();
await apiClient.syncPush({ items, folders: [], device_id: getDeviceId() });
setSyncStatus('Synced');
```

```typescript
// Line 49 — replace TODO with:
await apiClient.syncPurge();
```

**Pre-req:** Check `@vaultic/api` exports `syncPush` and `syncPurge` methods. If not, add them.

### 2.5 Gitignore .wxt/ (also in Phase 1)
Already covered in Phase 1.4 — skip duplicate.

## Todo
- [ ] 2.1 Extract background.ts handlers into separate modules
- [ ] 2.2 Extract register-form style constants to separate file
- [ ] 2.3 Decide on sync_service.rs — keep as-is (YAGNI)
- [ ] 2.4 Implement sync push TODO in settings-page.tsx
- [ ] 2.4 Implement sync purge TODO in settings-page.tsx
- [ ] Verify: `pnpm build` passes after refactoring
- [ ] Verify: extension loads and works in browser

## Risk
- Refactoring background.ts could break message routing → test manually in browser
- TODO implementation depends on `@vaultic/api` having sync methods → check first
