# Brainstorm: Auto Cloud Sync

**Date:** 2026-03-30
**Status:** Approved design, pending implementation

## Problem

Sync hiện tại chỉ chạy khi user nhấn "Sync Now" trong Settings. Cần auto-sync: real-time push on CRUD, mandatory pull on login/unlock, periodic background sync.

## Decisions

| Aspect | Decision |
|--------|----------|
| Push timing | Enqueue + push ngay, retry ở periodic |
| Periodic interval | 3 phút via `chrome.alarms` |
| Login trigger | Pull+merge sau **unlock vault** (cần master key) |
| Existing bugs | Fix luôn (pagination, device_id, enable bypass) |
| Conflict | LWW by `updated_at` (giữ nguyên) |
| WebSocket | Không cần |

## 3 Sync Triggers

### 1. Real-time push (on CRUD)
```
User action → VaultStore.putItem() → SyncQueue.enqueue() → push ngay
                                                          ↘ fail? → chờ periodic retry
```

### 2. Login/Unlock sync (mandatory pull)
```
Unlock vault → SyncEngine.sync() → push pending → pull+merge → update UI
```

### 3. Background periodic (chrome.alarms)
```
chrome.alarms "vaultic-sync" (3min) → check online + sync enabled + has userId
                                    → SyncEngine.sync()
```

## File Changes

| File | Change |
|------|--------|
| `client/packages/sync/src/sync-engine.ts` | Fix pagination loop |
| `client/packages/storage/src/indexeddb-store.ts` | Fix `device_id` hardcode |
| `client/apps/extension/src/background.ts` | Add `chrome.alarms` handler |
| `client/apps/extension/src/stores/auth-store.ts` | Trigger sync sau unlock |
| `client/apps/extension/src/components/settings/use-sync-settings.ts` | Fix `handleEnableSyncConfirm` → dùng SyncEngine, add real-time push |
| `client/apps/extension/src/hooks/use-auto-sync.ts` (**new**) | Hook quản lý enqueue+push on CRUD |
| `client/apps/extension/src/lib/sync-alarm.ts` (**new**) | chrome.alarms setup/teardown |

## Conflict Resolution (LWW)

- Server newer → Overwrite local
- Local newer → Keep local, push later
- Same timestamp → Ignore

## Bug Fixes (in scope)

1. **Pull pagination**: SyncEngine không loop `has_more` → fix add pagination loop
2. **device_id hardcode `''`**: IndexedDBStore hardcode → dùng `getDeviceId()`
3. **handleEnableSyncConfirm bypass**: Gọi thẳng fetchWithAuth thay vì SyncEngine → refactor dùng SyncEngine

## Risks

| Risk | Mitigation |
|------|-----------|
| Chrome kills SW sau 30s | `chrome.alarms` đánh thức SW, sync nhanh rồi release |
| Race condition push + periodic | Mutex/lock flag trong SyncEngine |
| Large vault pull timeout | Pagination loop, limit 100/page |

## Architecture Diagram

```
User Action ──→ Local DB ──→ SyncQueue ──→ Immediate Push ──→ Cloud API
                  ↑                              ↓ (fail)
                  │                        Retry at periodic
                  │
           Periodic Worker ──→ SyncQueue ──→ Push pending ──→ Cloud API
           (chrome.alarms       │                                │
            every 3min)         └── Pull delta ←─────────────────┘
                                         │
                                    Merge Logic (LWW)
                                         │
                                    Local DB updated

Unlock Vault ──→ SyncEngine.sync() ──→ Push + Pull + Merge
```
