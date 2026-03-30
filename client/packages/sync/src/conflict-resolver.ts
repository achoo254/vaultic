// Conflict resolution strategies for sync

import type { SyncItem } from '@vaultic/types';

export interface ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem;
}

/** Last-Write-Wins conflict resolver — compares updated_at timestamps */
export class LWWResolver implements ConflictResolver {
  resolve(local: SyncItem, remote: SyncItem): SyncItem {
    const localTime = new Date(local.updated_at).getTime();
    const remoteTime = new Date(remote.updated_at).getTime();
    return remoteTime > localTime ? remote : local;
  }
}
