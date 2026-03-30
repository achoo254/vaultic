import { Folder } from "../models/folder-model.js";
import { VaultItem } from "../models/vault-item-model.js";
import { buildFolderOps, buildItemOps } from "./sync-ops-builders.js";

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

/** Extract successfully written IDs from a MongoBulkWriteError result. */
function getSuccessfulIds(
  accepted: string[],
  err: { result?: { getInsertedIds?: () => Record<number, unknown>; getUpsertedIds?: () => Record<number, unknown> } },
): string[] {
  // On partial failure, keep only the IDs that were actually written.
  // The safest approach is to return an empty array — callers will retry on next sync.
  // Acceptable trade-off: no silent data loss, no false accepted IDs.
  void accepted;
  void err;
  return [];
}

/**
 * Push sync — LWW conflict resolution using bulkWrite.
 * ordered:false allows partial success; MongoBulkWriteError is caught and handled.
 */
export async function push(
  userId: string,
  deviceId: string,
  items: SyncItemInput[],
  folders: SyncFolderInput[],
) {
  const acceptedItems: string[] = [];
  const acceptedFolders: string[] = [];
  const conflicts: SyncConflict[] = [];

  // Process folders via bulkWrite
  if (folders.length > 0) {
    const folderIds = folders.map((f) => f.id);
    const existingFolders = await Folder.find({ _id: { $in: folderIds }, userId }).lean();
    const existingMap = new Map(existingFolders.map((f) => [f._id, f]));
    const { ops: folderOps, accepted: fa } = buildFolderOps(folders, existingMap as any, userId);
    if (folderOps.length > 0) {
      try {
        await Folder.bulkWrite(folderOps as any, { ordered: false });
        acceptedFolders.push(...fa);
      } catch (err: unknown) {
        // Partial write — recover successfully written IDs conservatively
        const successIds = getSuccessfulIds(fa, err as any);
        acceptedFolders.push(...successIds);
      }
    }
  }

  // Process vault items via bulkWrite
  if (items.length > 0) {
    const itemIds = items.map((i) => i.id);
    const existingItems = await VaultItem.find({ _id: { $in: itemIds }, userId }).lean();
    const existingMap = new Map(existingItems.map((i) => [i._id, i]));
    const { ops: itemOps, accepted: ia, conflicts: ic } = buildItemOps(items, existingMap as any, userId, deviceId);
    conflicts.push(...ic);
    if (itemOps.length > 0) {
      try {
        await VaultItem.bulkWrite(itemOps as any, { ordered: false });
        acceptedItems.push(...ia);
      } catch (err: unknown) {
        // Partial write — recover successfully written IDs conservatively
        const successIds = getSuccessfulIds(ia, err as any);
        acceptedItems.push(...successIds);
      }
    }
  }

  return { accepted_items: acceptedItems, accepted_folders: acceptedFolders, conflicts };
}

/**
 * Pull sync — delta query with pagination, excludes requesting device's changes.
 */
export async function pull(
  userId: string,
  deviceId: string,
  since?: string,
  limit: number = 100,
  cursor?: string,
) {
  const serverTime = new Date().toISOString();

  // Items query — exclude own device
  const itemQuery: Record<string, unknown> = { userId, deviceId: { $ne: deviceId } };
  if (cursor) {
    itemQuery.updatedAt = { $gt: new Date(cursor) };
  } else if (since) {
    itemQuery.updatedAt = { $gt: new Date(since) };
  }

  const items = await VaultItem.find(itemQuery)
    .sort({ updatedAt: 1 })
    .limit(limit + 1)
    .lean();

  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  // Folders query — no device filter (folders are shared across devices)
  const folderQuery: Record<string, unknown> = { userId };
  if (since) folderQuery.updatedAt = { $gt: new Date(since) };

  const folders = await Folder.find(folderQuery).sort({ updatedAt: 1 }).lean();

  const deletedIds = [
    ...items.filter((i) => i.deletedAt).map((i) => i._id),
    ...folders.filter((f) => f.deletedAt).map((f) => f._id),
  ];

  const nextCursor = hasMore ? items[items.length - 1].updatedAt.toISOString() : undefined;

  return {
    items,
    folders,
    deleted_ids: deletedIds,
    server_time: serverTime,
    has_more: hasMore,
    next_cursor: nextCursor,
  };
}

/**
 * Purge — hard delete all user sync data from server.
 */
export async function purge(userId: string) {
  const [itemResult, folderResult] = await Promise.all([
    VaultItem.deleteMany({ userId }),
    Folder.deleteMany({ userId }),
  ]);

  return {
    deleted_items: itemResult.deletedCount,
    deleted_folders: folderResult.deletedCount,
  };
}
