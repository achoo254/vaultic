# Phase 4: Sync Integration

## Overview
SyncEngine and settings page sync operations use userId to push/pull only current user's data.

## Files to Modify

### 1. `client/packages/sync/src/sync-engine.ts`

**Add userId to SyncEngine:**
```typescript
export class SyncEngine {
  constructor(
    private store: VaultStore & { getMetadata; setMetadata },
    private queue: SyncQueue,
    private api: SyncApiAdapter,
    private resolver: ConflictResolver,
    private userId: string,        // NEW
  ) {}

  async sync(): Promise<SyncResult> {
    // Push: dequeue only current user's entries
    const pending = await this.queue.dequeueAll(this.userId);

    // Get items: scoped to userId
    for (const id of itemIds) {
      const item = await this.store.getItem(this.userId, id);
      if (item) items.push(item);
    }

    // Pull: merged items get tagged with userId before storing
    for (const remoteItem of delta.items) {
      const tagged = { ...remoteItem, user_id: this.userId };
      const local = await this.store.getItem(this.userId, remoteItem.id);
      // ...LWW resolution, store with user_id
      await this.store.putItem(tagged);
    }
    // ...rest unchanged
  }
}
```

### 2. `client/apps/extension/src/components/settings/settings-page.tsx`

**Pass userId when creating SyncEngine:**
```typescript
import { useAuthStore } from '../../stores/auth-store';

const handleSyncNow = async () => {
  const userId = useAuthStore.getState().getCurrentUserId();
  const engine = new SyncEngine(store, queue, apiAdapter, new LWWResolver(), userId);
  // ...rest unchanged
};
```

**`handleEnableSyncConfirm()`** — push only current user's items:
```typescript
const userId = useAuthStore.getState().getCurrentUserId();
const items = await store.getAllItems(userId);
```

## Success Criteria
- [x] SyncEngine only pushes current user's queued items
- [x] Pulled items tagged with current userId before storing
- [x] "Sync Now" and "Enable Sync" scoped to current user
- [x] `tsc --noEmit` passes for all packages
- [x] Manual test: create items as user A, login as user B, sync → user A's items NOT pushed

## Risks
- Metadata key `last_sync` is global — should be per-user: `last_sync_${userId}`
  - Fix: `this.store.getMetadata(`last_sync_${this.userId}`)`
