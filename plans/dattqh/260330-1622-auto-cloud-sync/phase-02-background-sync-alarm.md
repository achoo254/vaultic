---
phase: 2
title: "Background Sync Alarm"
status: completed
priority: P1
estimated_effort: small
---

# Phase 2: Background Sync Alarm

## Overview

Add periodic background sync via `chrome.alarms` API. Fires every 3 min when sync enabled + online.

## Context

- `background.ts` already has alarm handler for auto-lock + clipboard
- chrome.alarms minimum interval: 1 minute
- Service worker killed after 30s inactivity — alarms wake it up

## 2.1 — Create sync alarm handler

**New file:** `client/apps/extension/src/entrypoints/background/sync-alarm-handler.ts`

Responsibilities:
- `initSyncAlarm()` — register alarm if sync_enabled, teardown if not
- `handleSyncAlarm()` — executed on alarm fire, runs SyncEngine.sync()
- `listenSyncSettingsChanges()` — watch `chrome.storage.local` for sync_enabled toggle
- Exponential backoff: track consecutive failures, adjust alarm period

```typescript
const ALARM_NAME = 'vaultic-sync';
const BASE_INTERVAL = 3; // minutes
const MAX_INTERVAL = 30; // minutes
let consecutiveFailures = 0;

export async function initSyncAlarm() {
  const { sync_enabled } = await chrome.storage.local.get('sync_enabled');
  if (sync_enabled) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: BASE_INTERVAL });
  }
}

export async function handleSyncAlarm() {
  if (!navigator.onLine) return;
  // Check sync_enabled + has userId
  // Create SyncEngine singleton → sync()
  // On success: reset backoff
  // On failure: increase backoff, recreate alarm with longer interval
}

export function listenSyncSettingsChanges() {
  chrome.storage.local.onChanged.addListener((changes) => {
    if ('sync_enabled' in changes) {
      if (changes.sync_enabled.newValue) {
        chrome.alarms.create(ALARM_NAME, { periodInMinutes: BASE_INTERVAL });
        consecutiveFailures = 0;
      } else {
        chrome.alarms.clear(ALARM_NAME);
      }
    }
  });
}
```

**Key:** SyncEngine instance needs to be reusable (singleton pattern within background SW). Avoid creating new `IndexedDBStore` + `IndexedDBSyncQueue` on every alarm.

## 2.2 — Wire into background.ts

**File:** `client/apps/extension/src/entrypoints/background.ts`

```typescript
import { initSyncAlarm, handleSyncAlarm, listenSyncSettingsChanges } from './background/sync-alarm-handler';

// In defineBackground():
initSyncAlarm();
listenSyncSettingsChanges();

// In alarm listener:
if (alarm.name === 'vaultic-sync') await handleSyncAlarm();
```

## 2.3 — Shared SyncEngine factory

Need a shared way to create SyncEngine (used by alarm handler, unlock trigger, CRUD push). Extract factory function.

**New file:** `client/apps/extension/src/lib/create-sync-engine.ts`

```typescript
export function createSyncEngine(userId: string): SyncEngine {
  const store = new IndexedDBStore();
  const queue = new IndexedDBSyncQueue();
  const apiAdapter: SyncApiAdapter = { push: ..., pull: ... };
  return new SyncEngine(store, queue, apiAdapter, new LWWResolver(), userId);
}
```

This DRYs up the SyncEngine creation currently duplicated in `use-sync-settings.ts`.

## Todo

- [x] 2.1 Create `sync-alarm-handler.ts` with init, handle, listen functions
- [x] 2.2 Wire alarm handler into `background.ts`
- [x] 2.3 Extract `create-sync-engine.ts` factory (DRY)
- [x] Implement exponential backoff (3→6→12→30 min)
- [x] Run `pnpm build` to verify

## Success Criteria

- Alarm fires every 3 min when sync enabled
- Alarm stopped when sync disabled
- Backoff increases on consecutive failures, resets on success
- SyncEngine creation is DRY (single factory)
- `pnpm build` passes
