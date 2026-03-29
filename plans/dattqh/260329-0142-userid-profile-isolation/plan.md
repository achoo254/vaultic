---
status: completed
created: 2026-03-29
completed: 2026-03-29
slug: userid-profile-isolation
---

# userId-based Profile Isolation for IndexedDB

## Problem
IndexedDB stores ALL vault items without userId tagging. Sync pushes everything to server regardless of which account created the data. Multi-account use on same browser mixes data.

## Solution
Add `user_id` field to VaultItem, Folder, SyncQueueEntry. Filter all storage operations by current userId. Offline = `"local"`, Online = JWT userId.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Types + Schema](phase-01-types-and-schema.md) | completed | S | 3 files |
| 2 | [Storage Layer](phase-02-storage-layer.md) | completed | M | 3 files |
| 3 | [Auth + Vault Store](phase-03-auth-vault-store.md) | completed | M | 2 files |
| 4 | [Sync Integration](phase-04-sync-integration.md) | completed | S | 2 files |

## Key Decisions
- `user_id = "local"` for offline, `user_id = JWT userId` for online
- Single IDB database, filter by index — no per-user databases
- IDB version bump 2→3 with migration (tag existing items)
- `VaultStore` interface methods gain `userId` param
- SyncEngine receives userId via constructor or sync() param
- Backend: NO changes needed (already filters by JWT userId)

## Dependencies
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3
