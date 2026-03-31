# Phase 4: Web-Specific Features

## Priority: Medium
## Status: ✅ COMPLETED
## Effort: 0.5 day

## Overview

Implement auto-lock, sync scheduling, and clipboard clear using web APIs (replacing chrome.alarms/chrome.storage.session).

## Context Links

- Extension auto-lock: `client/apps/extension/src/entrypoints/background/auto-lock-handler.ts`
- Extension sync alarm: `client/apps/extension/src/entrypoints/background/sync-alarm-handler.ts`
- Extension clipboard: `client/apps/extension/src/entrypoints/background/clipboard-handler.ts`

## Files to Create

### 1. `client/apps/web/src/lib/web-auto-lock.ts` (~40 LOC)

Auto-lock vault after inactivity using `visibilitychange` + `setTimeout`.

```typescript
// Auto-lock vault after inactivity period
// Extension uses chrome.alarms — web uses setTimeout + visibilitychange

let lockTimer: ReturnType<typeof setTimeout> | null = null;
const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes default

export function startAutoLock(onLock: () => void, timeoutMs = LOCK_TIMEOUT_MS) {
  resetTimer(onLock, timeoutMs);

  // Reset timer on user activity
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  const reset = () => resetTimer(onLock, timeoutMs);
  events.forEach(e => document.addEventListener(e, reset, { passive: true }));

  // Lock immediately when tab hidden for extended period
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Shorter timeout when tab not visible
      resetTimer(onLock, Math.min(timeoutMs, 5 * 60 * 1000));
    } else {
      resetTimer(onLock, timeoutMs);
    }
  });
}

export function stopAutoLock() {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = null;
}

function resetTimer(onLock: () => void, timeoutMs: number) {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(onLock, timeoutMs);
}
```

### 2. `client/apps/web/src/lib/web-sync-scheduler.ts` (~35 LOC)

Periodic sync using `setInterval` + sync on tab focus.

```typescript
// Sync scheduler for web — replaces chrome.alarms
// Syncs on interval while tab open + on tab regain focus + before close

let syncInterval: ReturnType<typeof setInterval> | null = null;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startSyncScheduler(doSync: () => Promise<void>, intervalMs = SYNC_INTERVAL_MS) {
  // Periodic sync while tab open
  syncInterval = setInterval(() => {
    if (!document.hidden) doSync().catch(console.error);
  }, intervalMs);

  // Sync when tab regains focus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) doSync().catch(console.error);
  });

  // Quick push before tab close
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon or sync fetch for reliability
    doSync().catch(() => {});
  });
}

export function stopSyncScheduler() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = null;
}
```

### 3. `client/apps/web/src/lib/web-clipboard.ts` (~15 LOC)

Auto-clear clipboard after copy.

```typescript
// Auto-clear clipboard after timeout
const CLIPBOARD_CLEAR_MS = 30 * 1000; // 30 seconds

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copyAndAutoClear(text: string, timeoutMs = CLIPBOARD_CLEAR_MS) {
  await navigator.clipboard.writeText(text);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(async () => {
    // Only clear if clipboard still has our text
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) await navigator.clipboard.writeText('');
    } catch {
      // Clipboard read may fail if tab not focused — ignore
    }
  }, timeoutMs);
}
```

## Files to Modify

### `client/apps/web/src/stores/auth-store.ts`

Wire auto-lock:

```typescript
// In hydrate() or after unlock():
import { startAutoLock, stopAutoLock } from '../lib/web-auto-lock';

// After unlock succeeds:
startAutoLock(() => get().lock());

// In lock() and logout():
stopAutoLock();
```

### `client/apps/web/src/stores/vault-store.ts`

Wire sync scheduler:

```typescript
import { startSyncScheduler, stopSyncScheduler } from '../lib/web-sync-scheduler';

// When sync enabled:
startSyncScheduler(() => get().syncNow());

// When sync disabled or logout:
stopSyncScheduler();
```

### Copy button components

Replace direct `navigator.clipboard.writeText()` with `copyAndAutoClear()`:

```typescript
import { copyAndAutoClear } from '../lib/web-clipboard';
// onClick: await copyAndAutoClear(password);
```

## Implementation Steps

1. Create web-auto-lock.ts
2. Create web-sync-scheduler.ts
3. Create web-clipboard.ts
4. Wire auto-lock into auth-store (after unlock, clear on lock/logout)
5. Wire sync scheduler into vault-store (when sync toggled on)
6. Replace clipboard.writeText with copyAndAutoClear in copy buttons
7. Test: inactivity → vault locks
8. Test: tab focus → sync triggers
9. Test: copy password → clipboard clears after 30s

## Todo

- [x] Create web-auto-lock.ts
- [x] Create web-sync-scheduler.ts
- [x] Create web-clipboard.ts
- [x] Wire auto-lock in auth-store
- [x] Wire sync scheduler in vault-store
- [x] Wire clipboard auto-clear in copy buttons
- [x] Test auto-lock after 15min inactivity
- [x] Test sync on tab focus
- [x] Test clipboard clear after 30s

## Success Criteria

- Vault auto-locks after 15 minutes of inactivity
- Vault locks faster (5min) when tab hidden
- Sync triggers every 5 minutes + on tab regain focus
- Clipboard auto-clears 30 seconds after copying password
- All timers cleaned up on logout/lock

## Risk Assessment

- **beforeunload sync**: May not complete for large syncs — use for quick push only
- **Clipboard API permission**: `readText()` may fail without focus — catch and ignore
- **Timer cleanup**: Must clear all timers on logout to prevent memory leaks
