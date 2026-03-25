// Delta sync engine — pushes local changes, pulls remote changes

import type { SyncStatus } from '@vaultic/types';
import type { VaultStore, SyncQueue } from '@vaultic/storage';
import type { ConflictResolver } from './conflict-resolver';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  status: SyncStatus;
}

/** Delta sync engine — opt-in cloud sync with LWW conflict resolution */
export class SyncEngine {
  constructor(
    private _store: VaultStore,
    private _queue: SyncQueue,
    private _resolver: ConflictResolver,
  ) {}

  async sync(): Promise<SyncResult> {
    // Implementation in Phase 5
    throw new Error('Not implemented: Phase 5');
  }
}
