// Conflict resolution strategies for sync

import type { SyncItem } from '@vaultic/types';

export interface ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem;
}

/** Last-Write-Wins conflict resolver — compares updated_at timestamps */
export class LWWResolver implements ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem {
    return remote.updated_at > local.updated_at ? remote : local;
  }
}
