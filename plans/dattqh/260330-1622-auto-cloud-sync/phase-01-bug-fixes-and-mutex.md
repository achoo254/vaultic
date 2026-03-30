---
phase: 1
title: "Bug Fixes + Sync Mutex"
status: completed
priority: P0
estimated_effort: small
---

# Phase 1: Bug Fixes + Sync Mutex

## Overview

Fix 3 existing sync bugs and add mutex to SyncEngine. Foundation for phases 2-3.

## Context

- Security audit findings: #2 (pagination), #3 (mutex), #4 (enable bypass), #9 (device_id)
- Files: `sync-engine.ts`, `indexeddb-store.ts`, `use-sync-settings.ts`

## 1.1 — Fix pagination loop in SyncEngine

**File:** `client/packages/sync/src/sync-engine.ts`

Current code pulls only 1 page (line 102). Need loop until `has_more === false`.

```typescript
// Replace single pull call with pagination loop
let allItems: VaultItem[] = [];
let allFolders: Folder[] = [];
let allDeletedIds: string[] = [];
let cursor: string | null = null;
let serverTime = '';
const MAX_PAGES = 50; // safety cap

for (let page = 0; page < MAX_PAGES; page++) {
  const delta = await this.api.pull(cursor || lastSync, deviceId, cursor);
  allItems.push(...delta.items);
  allFolders.push(...delta.folders);
  allDeletedIds.push(...delta.deleted_ids);
  serverTime = delta.server_time;
  if (!delta.has_more || !delta.next_cursor) break;
  cursor = delta.next_cursor;
}
```

**SyncApiAdapter.pull** signature needs update to accept `cursor` param:
```typescript
pull(since: string | null, deviceId: string, cursor?: string | null): Promise<{
  items: VaultItem[];
  folders: Array<...>;
  deleted_ids: string[];
  server_time: string;
  has_more?: boolean;
  next_cursor?: string;
}>;
```

## 1.2 — Fix device_id hardcode

**File:** `client/packages/storage/src/indexeddb-store.ts`

Find where items are created with `device_id: ''` and replace with `getDeviceId()` from `@vaultic/sync`.

**Note:** `@vaultic/storage` should NOT depend on `@vaultic/sync`. Instead, accept `deviceId` as constructor param or method param in `IndexedDBStore`. The caller (extension) passes `getDeviceId()`.

```typescript
// Option: add deviceId to putItem if item.device_id is empty
// Let caller set device_id before calling putItem
```

## 1.3 — Fix handleEnableSyncConfirm bypass

**File:** `client/apps/extension/src/components/settings/use-sync-settings.ts`

Lines 106-131: direct `fetchWithAuth` call bypasses SyncEngine → no conflict resolution, no queue.

**Fix:** Replace with `SyncEngine.sync()` call (same pattern as `handleSyncNow`).

## 1.4 — Add sync mutex to SyncEngine

**File:** `client/packages/sync/src/sync-engine.ts`

Add `private _isSyncing = false` flag. If `sync()` called while already syncing, return early.

```typescript
private _isSyncing = false;

async sync(): Promise<SyncResult> {
  if (this._isSyncing) {
    return { status: 'idle', pushed: 0, pulled: 0, conflicts: 0 };
  }
  this._isSyncing = true;
  try {
    // ... existing sync logic
  } finally {
    this._isSyncing = false;
  }
}
```

## Todo

- [x] 1.1 Fix pagination loop in SyncEngine + update SyncApiAdapter interface
- [x] 1.2 Fix device_id — accept from caller, not hardcoded
- [x] 1.3 Refactor handleEnableSyncConfirm → use SyncEngine
- [x] 1.4 Add `_isSyncing` mutex flag to SyncEngine
- [x] Run `pnpm build` to verify no type errors
- [x] Update pull adapter in `use-sync-settings.ts` to pass cursor

## Success Criteria

- SyncEngine loops all pages on pull
- No hardcoded empty device_id
- Enable sync uses SyncEngine for conflict-safe initial push
- Concurrent sync() calls are safely skipped
- `pnpm build` passes
