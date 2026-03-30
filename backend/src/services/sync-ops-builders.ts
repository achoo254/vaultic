// Helper: build bulkWrite operation arrays for push sync (LWW resolution)
// Extracted from sync-service.ts to keep it under 200 lines
// ops arrays typed as any[] to satisfy Mongoose bulkWrite overloads (string _id vs ObjectId)

interface SyncItemInput {
  id: string;
  folderId?: string | null;
  itemType?: string;
  encryptedData: string;
  version: number;
  updatedAt: string;
  deletedAt?: string | null;
}

interface SyncFolderInput {
  id: string;
  encryptedName: string;
  parentId?: string | null;
  updatedAt: string;
  deletedAt?: string | null;
}

interface SyncConflict {
  id: string;
  serverVersion: number;
  serverUpdatedAt: string;
}

export interface FolderOpsResult {
  ops: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  accepted: string[];
}

export interface ItemOpsResult {
  ops: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  accepted: string[];
  conflicts: SyncConflict[];
}

/** Build bulkWrite ops for folder push — LWW: client wins if newer than server. */
export function buildFolderOps(
  folders: SyncFolderInput[],
  existingMap: Map<string, { _id: string; updatedAt: Date }>,
  userId: string,
): FolderOpsResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];
  const accepted: string[] = [];

  for (const f of folders) {
    const existing = existingMap.get(f.id);
    if (existing) {
      if (new Date(f.updatedAt) > existing.updatedAt) {
        ops.push({
          updateOne: {
            filter: { _id: f.id, userId },
            update: {
              $set: {
                encryptedName: f.encryptedName,
                parentId: f.parentId ?? null,
                updatedAt: new Date(f.updatedAt),
                deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
              },
            },
          },
        });
        accepted.push(f.id);
      }
      // Server newer → skip (LWW)
    } else {
      ops.push({
        insertOne: {
          document: {
            _id: f.id,
            userId,
            encryptedName: f.encryptedName,
            parentId: f.parentId ?? null,
            updatedAt: new Date(f.updatedAt),
            deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
          },
        },
      });
      accepted.push(f.id);
    }
  }

  return { ops, accepted };
}

/** Build bulkWrite ops for item push — LWW: client wins if newer, else conflict. */
export function buildItemOps(
  items: SyncItemInput[],
  existingMap: Map<string, { _id: string; version: number; updatedAt: Date }>,
  userId: string,
  deviceId: string,
): ItemOpsResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];
  const accepted: string[] = [];
  const conflicts: SyncConflict[] = [];

  for (const item of items) {
    const existing = existingMap.get(item.id);
    if (existing) {
      if (new Date(item.updatedAt) > existing.updatedAt) {
        ops.push({
          updateOne: {
            filter: { _id: item.id, userId },
            update: {
              $set: {
                encryptedData: item.encryptedData,
                folderId: item.folderId ?? null,
                version: item.version,
                deviceId,
                updatedAt: new Date(item.updatedAt),
                deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
              },
            },
          },
        });
        accepted.push(item.id);
      } else {
        conflicts.push({
          id: item.id,
          serverVersion: existing.version,
          serverUpdatedAt: existing.updatedAt.toISOString(),
        });
      }
    } else {
      ops.push({
        insertOne: {
          document: {
            _id: item.id,
            userId,
            folderId: item.folderId ?? null,
            itemType: item.itemType ?? 'login',
            encryptedData: item.encryptedData,
            deviceId,
            version: item.version,
            updatedAt: new Date(item.updatedAt),
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          },
        },
      });
      accepted.push(item.id);
    }
  }

  return { ops, accepted, conflicts };
}
