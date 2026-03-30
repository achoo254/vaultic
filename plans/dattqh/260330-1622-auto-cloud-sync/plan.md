---
title: "Auto Cloud Sync"
description: "Add automatic cloud sync with 3 triggers (real-time push, unlock pull, periodic background) + sync mutex + bug fixes"
status: completed
priority: P1
created: 2026-03-30
estimated_effort: medium
branch: main
blocks: []
blockedBy: []
---

# Auto Cloud Sync

## Context

- Brainstorm: `plans/dattqh/reports/brainstorm-260330-1611-auto-cloud-sync.md`
- Security audit: `plans/dattqh/reports/security-audit-260330-1618-auto-cloud-sync-design.md`
- Current sync: manual only ("Sync Now" button in Settings)
- Goal: auto-sync when user CRUDs, unlocks vault, and periodic background

## Scope

| In Scope | Out of Scope |
|----------|-------------|
| Sync mutex (prevent concurrent syncs) | Rate limiting (defer — low user count) |
| Real-time push on CRUD | WebSocket |
| Pull+merge on vault unlock | Server-side changes (API already supports all needed ops) |
| Periodic background sync (3min, chrome.alarms) | UI sync status indicator |
| Fix: pagination loop in SyncEngine | |
| Fix: device_id hardcode '' | |
| Fix: handleEnableSyncConfirm bypass | |
| Exponential backoff on sync failure | |

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Bug fixes + sync mutex | completed | [phase-01](phase-01-bug-fixes-and-mutex.md) |
| 2 | Background sync alarm | completed | [phase-02](phase-02-background-sync-alarm.md) |
| 3 | Auto-sync triggers (CRUD + unlock) | completed | [phase-03](phase-03-auto-sync-triggers.md) |

## Architecture

```
User CRUD ──→ Local DB ──→ SyncQueue ──→ Immediate Push ──→ Cloud API
                                              ↓ (fail)
                                         Retry at periodic
Periodic (3min) ──→ SyncEngine.sync() [mutex guarded]
Unlock vault ──→ SyncEngine.sync() [mutex guarded]
```

## Key Decisions

- Push timing: enqueue + push ngay, retry ở periodic
- Periodic: 3 phút via `chrome.alarms`
- Login trigger: sau unlock vault (cần master key)
- Conflict: LWW by `updated_at` (giữ nguyên)
- Mutex: **module-level lock** trong `create-sync-engine.ts` (NOT instance-level)
- Backoff: 3min → 6min → 12min → 30min max on consecutive failures
- Unlock UX: sync background, không block UI
- Factory: shared `createSyncEngine()` cho cả popup + background
- Enqueue audit: scan + fix tất cả CRUD paths trong Phase 1

## Validation Summary

**Validated:** 2026-03-30
**Questions asked:** 4

### Confirmed Decisions
- Mutex scope: module-level lock (shared across all callers), NOT per-instance
- Enqueue gap: audit + fix missing enqueue trong Phase 1 (trước khi wire triggers)
- Unlock UX: background sync, không block UI, không cần loading state
- DRY factory: shared `createSyncEngine(userId)` dùng cho cả popup và background SW

### Action Items (Completed)
- [x] Phase 1: mutex implemented as _isSyncing flag in SyncEngine
- [x] Phase 1: CRUD paths audited and fixed — all paths now enqueue to SyncQueue
- [x] Phase 2: factory (create-sync-engine.ts) works in both React (popup) and Service Worker (background) contexts
