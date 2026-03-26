# Phase 4: Share Module

## Context
- [plan.md](./plan.md) | [phase-03](./phase-03-sync-module.md)
- Rust reference: `_archive/crates/vaultic-server/src/services/share_service.rs`

## Overview
- **Priority:** P1
- **Status:** completed
- **Description:** Implement secure share: create, retrieve (atomic view counting), meta, delete. Static share page.

## Key Insights
- Share ID: 12-char random alphanumeric (not UUID, not ObjectId) — URL-friendly
- Atomic view counting: `findOneAndUpdate` with `$inc` + condition `currentViews < maxViews`
- Expiry check on retrieve + meta — return 410 Gone if expired or maxViews reached
- Owner-only delete — check userId matches
- Static share page served at `/s/:id` — HTML with client-side decryption (key in URL fragment)

## Files to Create

```
backend/src/
├── models/
│   └── secure-share-model.ts  # Mongoose SecureShare schema
├── services/
│   └── share-service.ts       # create, retrieve, getMeta, delete
├── routes/
│   └── share-route.ts         # CRUD + static page
└── static/
    └── share-page.html        # COPY from _archive/crates/vaultic-server/static/
```

## Mongoose Model

```typescript
// backend/src/models/secure-share-model.ts
const SHARE_ID_LEN = 12;
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateShareId(): string {
  const bytes = randomBytes(SHARE_ID_LEN);
  return Array.from(bytes, b => ID_CHARS[b % ID_CHARS.length]).join('');
}

const secureShareSchema = new Schema({
  _id: { type: String, default: generateShareId },  // 12-char random
  vaultItemId: { type: String, default: null },
  userId: { type: String, required: true, index: true },
  encryptedData: { type: String, required: true },
  maxViews: { type: Number, default: null },
  currentViews: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  accessedAt: { type: Date, default: null },
}, { timestamps: true });

secureShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup
```

Note: MongoDB TTL index auto-deletes expired shares. No cron needed.

## Critical Logic: Atomic View Counting

```typescript
// backend/src/services/share-service.ts
async function retrieve(shareId: string): Promise<string> {
  // Atomic: increment views only if allowed, return doc
  const share = await SecureShare.findOneAndUpdate(
    {
      _id: shareId,
      $or: [
        { maxViews: null },
        { $expr: { $lt: ['$currentViews', '$maxViews'] } },
      ],
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    },
    {
      $inc: { currentViews: 1 },
      $set: { accessedAt: new Date() },
    },
    { new: false }  // return pre-update doc to check state
  );

  if (!share) {
    // Distinguish between not found, expired, max views
    const existing = await SecureShare.findById(shareId).lean();
    if (!existing) throw AppError.notFound('share not found');
    if (existing.expiresAt && new Date() > existing.expiresAt)
      throw AppError.gone('share link has expired');
    throw AppError.gone('share link max views reached');
  }

  return share.encryptedData;
}
```

**Important**: The `$or` conditions must be combined properly. Corrected approach:

```typescript
async function retrieve(shareId: string): Promise<string> {
  const now = new Date();
  const share = await SecureShare.findOneAndUpdate(
    {
      _id: shareId,
      $and: [
        { $or: [{ maxViews: null }, { $expr: { $lt: ['$currentViews', '$maxViews'] } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    },
    { $inc: { currentViews: 1 }, $set: { accessedAt: now } },
    { new: false },
  );

  if (!share) {
    const existing = await SecureShare.findById(shareId).lean();
    if (!existing) throw AppError.notFound('share not found');
    if (existing.expiresAt && now > existing.expiresAt)
      throw AppError.gone('share link has expired');
    throw AppError.gone('share link max views reached');
  }

  return share.encryptedData;
}
```

## Zod Schemas

```typescript
const createShareSchema = z.object({
  encryptedData: z.string().min(1),
  maxViews: z.number().int().positive().optional(),
  ttlHours: z.number().int().positive().optional(),
  vaultItemId: z.string().uuid().optional(),
});
```

## Route Definitions

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/v1/shares` | Yes | create |
| GET | `/api/v1/shares/:id` | No | retrieve (counts view) |
| GET | `/api/v1/shares/:id/meta` | No | getMeta (no view count) |
| DELETE | `/api/v1/shares/:id` | Yes | delete (owner only) |
| GET | `/s/:id` | No | static share page HTML |

Note: Rust used `/api/share` (singular), new API uses `/api/v1/shares` (plural, RESTful).

## Implementation Steps

1. Copy `_archive/crates/vaultic-server/static/share-page.html` to `backend/src/static/`
2. Create `backend/src/models/secure-share-model.ts`
3. Create `backend/src/services/share-service.ts` (create, retrieve, getMeta, delete)
4. Create `backend/src/routes/share-route.ts` with zod validation
5. Mount share routes in `server.ts`
6. Add static share page route `/s/:id`
7. Write tests

## Todo

- [x] Copy share-page.html to backend/src/static/
- [x] Create SecureShare Mongoose model with TTL index
- [x] Implement share service (create, retrieve, getMeta, delete)
- [x] Implement atomic view counting with findOneAndUpdate
- [x] Create share routes with zod validation
- [x] Mount routes + static page in server.ts
- [x] Manual test: create share returns 12-char ID
- [x] Manual test: retrieve increments view count
- [x] Manual test: retrieve fails after maxViews reached (410)
- [x] Manual test: retrieve fails after expiry (410)
- [x] Manual test: meta endpoint does NOT increment views
- [x] Manual test: delete by owner succeeds
- [x] Manual test: delete by non-owner fails (401)
- [x] Manual test: race condition — concurrent retrieves respect maxViews

## Success Criteria
- Share creation returns 12-char alphanumeric ID
- View counting is atomic — no TOCTOU race
- Expired/exhausted shares return 410 Gone
- TTL index auto-cleans expired shares
- Owner-only delete enforced
- Static share page served at `/s/:id`

## Security Considerations
- Decryption key in URL fragment — never reaches server
- Atomic update prevents view count bypass under concurrency
- TTL index ensures expired data cleaned automatically
