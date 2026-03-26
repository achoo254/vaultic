# Phase 3: Sync Module

## Context
- [plan.md](./plan.md) | [phase-02](./phase-02-auth-module.md)
- Rust reference: `_archive/crates/vaultic-server/src/services/sync_service.rs`
- Rust handler: `_archive/crates/vaultic-server/src/handlers/sync.rs`

## Overview
- **Priority:** P1
- **Status:** completed
- **Description:** Implement sync relay: push (LWW conflict resolution), pull (delta + pagination), purge. Mongoose models for Folder + VaultItem.

## Key Insights
- LWW logic: client wins if `item.updatedAt > server.updatedAt`, else server wins and reports conflict
- Pull excludes requesting device's own changes (prevent echo)
- Pull needs pagination (new vs Rust) — cursor-based using `updatedAt`
- Soft deletes: `deletedAt` field, included in pull so clients know to remove
- Purge = hard delete all user data from server

## Files to Create

```
backend/src/
├── models/
│   ├── folder-model.ts        # Mongoose Folder schema
│   └── vault-item-model.ts    # Mongoose VaultItem schema
├── services/
│   └── sync-service.ts        # push, pull, purge
└── routes/
    └── sync-route.ts          # POST push, GET pull, DELETE data
```

## Mongoose Models

```typescript
// backend/src/models/folder-model.ts
const folderSchema = new Schema({
  _id: { type: String },  // UUID from client
  userId: { type: String, required: true, index: true },
  encryptedName: { type: String, required: true },
  parentId: { type: String, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

folderSchema.index({ userId: 1, updatedAt: 1 });
```

```typescript
// backend/src/models/vault-item-model.ts
const vaultItemSchema = new Schema({
  _id: { type: String },  // UUID from client
  userId: { type: String, required: true, index: true },
  folderId: { type: String, default: null },
  itemType: { type: Number, default: 1 },
  encryptedData: { type: String, required: true },
  deviceId: { type: String, required: true },
  version: { type: Number, default: 1 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

vaultItemSchema.index({ userId: 1, deviceId: 1, updatedAt: 1 });
```

## Critical Logic: LWW Push

```typescript
// backend/src/services/sync-service.ts
async function pushItems(
  userId: string, deviceId: string,
  items: SyncItem[], folders: SyncFolder[]
): Promise<SyncPushResponse> {
  const acceptedItems: string[] = [];
  const acceptedFolders: string[] = [];
  const conflicts: SyncConflict[] = [];

  // Process folders
  for (const f of folders) {
    const existing = await Folder.findById(f.id);
    if (existing && existing.userId === userId) {
      if (new Date(f.updatedAt) > existing.updatedAt) {
        // Client wins — update
        await Folder.findByIdAndUpdate(f.id, {
          encryptedName: f.encryptedName,
          parentId: f.parentId,
          updatedAt: f.updatedAt,
          deletedAt: f.deletedAt ?? null,
        });
        acceptedFolders.push(f.id);
      }
      // Server newer → skip (client gets server version on pull)
    } else if (!existing) {
      // New folder — insert
      await Folder.create({
        _id: f.id, userId, encryptedName: f.encryptedName,
        parentId: f.parentId, updatedAt: f.updatedAt,
        deletedAt: f.deletedAt ?? null,
      });
      acceptedFolders.push(f.id);
    }
    // Different user → silently ignore
  }

  // Process vault items (same LWW pattern)
  for (const item of items) {
    const existing = await VaultItem.findById(item.id);
    if (existing && existing.userId === userId) {
      if (new Date(item.updatedAt) > existing.updatedAt) {
        await VaultItem.findByIdAndUpdate(item.id, {
          encryptedData: item.encryptedData,
          folderId: item.folderId,
          version: item.version,
          deviceId, updatedAt: item.updatedAt,
          deletedAt: item.deletedAt ?? null,
        });
        acceptedItems.push(item.id);
      } else {
        conflicts.push({
          id: item.id,
          serverVersion: existing.version,
          serverUpdatedAt: existing.updatedAt.toISOString(),
        });
      }
    } else if (!existing) {
      await VaultItem.create({
        _id: item.id, userId, folderId: item.folderId,
        itemType: item.itemType ?? 1, encryptedData: item.encryptedData,
        deviceId, version: item.version, updatedAt: item.updatedAt,
        deletedAt: item.deletedAt ?? null,
      });
      acceptedItems.push(item.id);
    }
  }

  return { acceptedItems, acceptedFolders, conflicts };
}
```

## Critical Logic: Delta Pull with Pagination

```typescript
async function pull(
  userId: string, deviceId: string,
  since?: string, limit: number = 100, cursor?: string
): Promise<SyncPullResponse> {
  const serverTime = new Date().toISOString();
  const query: any = { userId, deviceId: { $ne: deviceId } };

  if (since) query.updatedAt = { $gt: new Date(since) };
  if (cursor) query.updatedAt = { ...query.updatedAt, $gt: new Date(cursor) };

  const items = await VaultItem.find(query)
    .sort({ updatedAt: 1 })
    .limit(limit + 1)  // fetch 1 extra to detect hasMore
    .lean();

  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const folderQuery: any = { userId };
  if (since) folderQuery.updatedAt = { $gt: new Date(since) };

  const folders = await Folder.find(folderQuery)
    .sort({ updatedAt: 1 })
    .lean();

  const deletedIds = [
    ...items.filter(i => i.deletedAt).map(i => i._id),
    ...folders.filter(f => f.deletedAt).map(f => f._id),
  ];

  const nextCursor = hasMore ? items[items.length - 1].updatedAt.toISOString() : undefined;

  return { items, folders, deletedIds, serverTime, hasMore, nextCursor };
}
```

## Zod Schemas

```typescript
const syncItemSchema = z.object({
  id: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  itemType: z.number().optional(),
  encryptedData: z.string().min(1),
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const syncFolderSchema = z.object({
  id: z.string().uuid(),
  encryptedName: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const pushSchema = z.object({
  deviceId: z.string().min(1),
  items: z.array(syncItemSchema).default([]),
  folders: z.array(syncFolderSchema).default([]),
});

const pullQuerySchema = z.object({
  deviceId: z.string().min(1),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().datetime().optional(),
});
```

## Route Definitions

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/v1/sync/push` | Yes | push |
| GET | `/api/v1/sync/pull` | Yes | pull (query params) |
| DELETE | `/api/v1/sync/data` | Yes | purge |

Note: Rust used `/purge`, new API uses `/data` (RESTful — deleting user's sync data).

## Implementation Steps

1. Create `backend/src/models/folder-model.ts`
2. Create `backend/src/models/vault-item-model.ts`
3. Create `backend/src/services/sync-service.ts` with push/pull/purge
4. Create `backend/src/routes/sync-route.ts` with zod validation
5. Mount sync routes in `server.ts` at `/api/v1/sync`
6. Write tests

## Todo

- [x] Create Folder Mongoose model with indexes
- [x] Create VaultItem Mongoose model with indexes
- [x] Implement push service (LWW conflict resolution, bulkWrite optimization)
- [x] Implement pull service (delta query + pagination)
- [x] Implement purge service (hard delete all user data)
- [x] Create sync routes with zod validation
- [x] Mount routes in server.ts
- [x] Manual test: push new items → accepted
- [x] Manual test: push older item → conflict reported
- [x] Manual test: push newer item → overwrites server
- [x] Manual test: pull excludes own deviceId
- [x] Manual test: pull with since filter
- [x] Manual test: pull pagination (limit + cursor)
- [x] Manual test: purge deletes all user data
- [x] Manual test: cannot push to another user's items

## Success Criteria
- Push accepts newer items, rejects older with conflict response
- Pull returns only other-device changes since timestamp
- Pull pagination works with cursor
- Purge removes all items + folders for user
- Ownership enforced — cannot modify another user's data

## Risk Assessment
- **LWW race condition**: Two devices push same item simultaneously. MongoDB single-doc atomicity sufficient — no transaction needed since we read-then-write per item. Acceptable for LWW model.
- **Pull pagination cursor drift**: If items update during pagination, cursor may skip/repeat. Acceptable — next full sync corrects.
