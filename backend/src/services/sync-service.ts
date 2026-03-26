import { Folder } from "../models/folder-model.js";
import { VaultItem } from "../models/vault-item-model.js";
import { User } from "../models/user-model.js";
import { AppError } from "../utils/app-error.js";

interface SyncItemInput {
  id: string;
  folderId?: string | null;
  itemType?: number;
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

/**
 * Push sync — LWW conflict resolution using bulkWrite.
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

    const folderOps: Parameters<typeof Folder.bulkWrite>[0] = [];
    for (const f of folders) {
      const existing = existingMap.get(f.id);
      if (existing) {
        if (new Date(f.updatedAt) > existing.updatedAt) {
          folderOps.push({
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
          acceptedFolders.push(f.id);
        }
        // Server newer → skip
      } else {
        folderOps.push({
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
        acceptedFolders.push(f.id);
      }
    }
    if (folderOps.length > 0) await Folder.bulkWrite(folderOps);
  }

  // Process vault items via bulkWrite
  if (items.length > 0) {
    const itemIds = items.map((i) => i.id);
    const existingItems = await VaultItem.find({ _id: { $in: itemIds }, userId }).lean();
    const existingMap = new Map(existingItems.map((i) => [i._id, i]));

    const itemOps: Parameters<typeof VaultItem.bulkWrite>[0] = [];
    for (const item of items) {
      const existing = existingMap.get(item.id);
      if (existing) {
        if (new Date(item.updatedAt) > existing.updatedAt) {
          itemOps.push({
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
          acceptedItems.push(item.id);
        } else {
          conflicts.push({
            id: item.id,
            serverVersion: existing.version,
            serverUpdatedAt: existing.updatedAt.toISOString(),
          });
        }
      } else {
        itemOps.push({
          insertOne: {
            document: {
              _id: item.id,
              userId,
              folderId: item.folderId ?? null,
              itemType: item.itemType ?? 1,
              encryptedData: item.encryptedData,
              deviceId,
              version: item.version,
              updatedAt: new Date(item.updatedAt),
              deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
            },
          },
        });
        acceptedItems.push(item.id);
      }
    }
    if (itemOps.length > 0) await VaultItem.bulkWrite(itemOps);
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
