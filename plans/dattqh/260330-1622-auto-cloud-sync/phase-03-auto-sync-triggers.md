---
phase: 3
title: "Auto-Sync Triggers (CRUD + Unlock)"
status: completed
priority: P1
estimated_effort: small
---

# Phase 3: Auto-Sync Triggers

## Overview

Wire up 2 remaining sync triggers:
1. Real-time push after CRUD operations
2. Pull+merge after vault unlock

## Context

- Phase 1 provides: fixed SyncEngine with mutex
- Phase 2 provides: `createSyncEngine()` factory, alarm handler
- Auth store `unlock()` at `auth-store.ts:117-142`

## 3.1 — Real-time push on CRUD

When user creates/updates/deletes a vault item or folder (with sync enabled), enqueue to SyncQueue + attempt immediate push.

**Approach:** Message-based. After CRUD op in popup, send message to background SW which runs sync.

**File:** `client/apps/extension/src/entrypoints/background.ts` — add message handler:
```typescript
case 'SYNC_PUSH': {
  // Check sync_enabled, run sync if enabled
  await handleSyncAlarm(); // reuse same logic
  return { ok: true };
}
```

**File:** Extension stores/hooks that do CRUD — after `store.putItem()` + `queue.enqueue()`, send:
```typescript
chrome.runtime.sendMessage({ type: 'SYNC_PUSH' });
```

This is simpler than a dedicated hook. Background SW handles the actual sync (with mutex protection).

**Note:** SyncQueue enqueue already happens in vault operations. We just need to trigger sync after enqueue.

## 3.2 — Sync on vault unlock

**File:** `client/apps/extension/src/stores/auth-store.ts`

After `set({ isLocked: false, vaultState: 'unlocked' })` in `unlock()` (line 142), trigger sync:

```typescript
// After successful unlock, trigger background sync
chrome.storage.local.get('sync_enabled').then(({ sync_enabled }) => {
  if (sync_enabled) {
    chrome.runtime.sendMessage({ type: 'SYNC_PUSH' }).catch(() => {});
  }
});
```

Same message type — background handles it uniformly. "SYNC_PUSH" is misleading name since it does full push+pull. Rename to `'SYNC_NOW'`.

## 3.3 — Ensure SyncQueue enqueue on CRUD

Verify that vault CRUD operations already enqueue to SyncQueue. Check:
- `credential-handler.ts` (save credential)
- Any store that calls `putItem` / `deleteItem` / `putFolder` / `deleteFolder`

If enqueue is missing, add it.

## Todo

- [x] 3.1 Add `SYNC_NOW` message handler in background.ts
- [x] 3.2 Send `SYNC_NOW` after vault unlock in auth-store
- [x] 3.3 Send `SYNC_NOW` after CRUD operations
- [x] 3.4 Verify SyncQueue enqueue exists in all CRUD paths
- [x] Run `pnpm build` to verify

## Success Criteria

- CRUD → auto push to cloud (if sync enabled + online)
- Unlock vault → pull+merge from cloud (if sync enabled + online)
- All triggers go through background SW → mutex-protected SyncEngine
- Failed pushes retry at next periodic alarm
- `pnpm build` passes
