# Phase 7: Client Package Updates

## Context
- [plan.md](./plan.md) | Depends on phases 2-4
- Client API: `client/packages/api/src/` (ofetch-based)
- Shared types: `shared/types/src/`

## Overview
- **Priority:** P2
- **Status:** completed
- **Description:** Update @vaultic/api to new /api/v1/ endpoints, update shared types for new response shapes, verify extension works end-to-end.

## Key Insights
- API paths changed: `/api/auth/*` → `/api/v1/auth/*`, `/api/share` → `/api/v1/shares`
- Sync pull changed: GET with query params + pagination response
- Sync purge path: `/api/sync/purge` → `/api/v1/sync/data`
- Share routes: singular → plural (`/share` → `/shares`)
- New endpoints: `/api/v1/auth/me`, `/api/v1/auth/password`
- Response shapes mostly same, pull adds `hasMore` + `nextCursor`

## Files to Modify

| File | Changes |
|------|---------|
| `shared/types/src/user.ts` | Add MeResponse, ChangePasswordRequest |
| `shared/types/src/sync.ts` | Add pagination fields to SyncPullResponse, add SyncFolder |
| `shared/types/src/share.ts` | Align with new response shapes (ShareMetaResponse) |
| `client/packages/api/src/client.ts` | No change (base client unchanged) |
| `client/packages/api/src/auth-api.ts` | Update paths to `/api/v1/auth/*`, add me() + changePassword() |
| `client/packages/api/src/sync-api.ts` | Update paths, fix pull to GET with query params |
| `client/packages/api/src/share-api.ts` | Update paths to `/api/v1/shares/*`, add meta() + delete() |

## Implementation Steps

### 1. Update shared/types/src/user.ts

Add:
```typescript
export interface MeResponse {
  id: string;
  email: string;
  createdAt: string;
}

export interface ChangePasswordRequest {
  current_auth_hash: string;
  new_auth_hash: string;
  new_encrypted_symmetric_key?: string;
}
```

### 2. Update shared/types/src/sync.ts

```typescript
// Add SyncFolder type
export interface SyncFolder {
  id: string;
  encryptedName: string;
  parentId?: string | null;
  updatedAt: string;
  deletedAt?: string | null;
}

// Update SyncPushRequest to include folders
export interface SyncPushRequest {
  device_id: string;
  items: SyncItem[];
  folders: SyncFolder[];
}

// Update SyncPullResponse with pagination
export interface SyncPullResponse {
  items: SyncItem[];
  folders: SyncFolder[];
  deletedIds: string[];
  serverTime: string;
  hasMore: boolean;
  nextCursor?: string;
}

// Add conflict type
export interface SyncConflict {
  id: string;
  serverVersion: number;
  serverUpdatedAt: string;
}

export interface SyncPushResponse {
  acceptedItems: string[];
  acceptedFolders: string[];
  conflicts: SyncConflict[];
}
```

### 3. Update shared/types/src/share.ts

```typescript
export interface CreateShareRequest {
  encrypted_data: string;
  max_views?: number;
  ttl_hours?: number;
  vault_item_id?: string;
}

export interface CreateShareResponse {
  share_id: string;
}

export interface ShareContentResponse {
  encrypted_data: string;
}

export interface ShareMetaResponse {
  max_views: number | null;
  current_views: number;
  expires_at: string | null;
}
```

### 4. Update client/packages/api/src/auth-api.ts

```typescript
export class AuthApi {
  constructor(private client: $Fetch) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.client('/api/v1/auth/register', { method: 'POST', body: data });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.client('/api/v1/auth/login', { method: 'POST', body: data });
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    return this.client('/api/v1/auth/refresh', {
      method: 'POST', body: { refresh_token: refreshToken },
    });
  }

  async me(): Promise<MeResponse> {
    return this.client('/api/v1/auth/me');
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.client('/api/v1/auth/password', { method: 'PUT', body: data });
  }
}
```

### 5. Update client/packages/api/src/sync-api.ts

```typescript
export class SyncApi {
  constructor(private client: $Fetch) {}

  async push(data: SyncPushRequest): Promise<SyncPushResponse> {
    return this.client('/api/v1/sync/push', { method: 'POST', body: data });
  }

  async pull(params: {
    deviceId: string; since?: string; limit?: number; cursor?: string;
  }): Promise<SyncPullResponse> {
    const query = new URLSearchParams();
    query.set('deviceId', params.deviceId);
    if (params.since) query.set('since', params.since);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    return this.client(`/api/v1/sync/pull?${query}`);
  }

  async purge(): Promise<void> {
    await this.client('/api/v1/sync/data', { method: 'DELETE' });
  }
}
```

### 6. Update client/packages/api/src/share-api.ts

```typescript
export class ShareApi {
  constructor(private client: $Fetch) {}

  async create(data: CreateShareRequest): Promise<CreateShareResponse> {
    return this.client('/api/v1/shares', { method: 'POST', body: data });
  }

  async get(shareId: string): Promise<ShareContentResponse> {
    return this.client(`/api/v1/shares/${shareId}`);
  }

  async meta(shareId: string): Promise<ShareMetaResponse> {
    return this.client(`/api/v1/shares/${shareId}/meta`);
  }

  async delete(shareId: string): Promise<void> {
    await this.client(`/api/v1/shares/${shareId}`, { method: 'DELETE' });
  }
}
```

### 7. Verify Extension

- Run `pnpm --filter extension dev`
- Test login flow → ensure API calls hit `/api/v1/*`
- Test sync push/pull if sync enabled
- Test share creation

## Todo

- [x] Update `shared/types/src/user.ts` — add MeResponse, ChangePasswordRequest
- [x] Update `shared/types/src/sync.ts` — add SyncFolder, pagination, conflict types
- [x] Update `shared/types/src/share.ts` — align response types
- [x] Update `shared/types/src/index.ts` — export new types
- [x] Update `client/packages/api/src/auth-api.ts` — v1 paths + new methods
- [x] Update `client/packages/api/src/sync-api.ts` — v1 paths + GET pull + pagination
- [x] Update `client/packages/api/src/share-api.ts` — v1 paths + meta + delete
- [x] Run `pnpm build` — all packages compile (8/8 ✓)
- [x] Manual test: extension login flow
- [x] Manual test: extension share creation

## Success Criteria
- `pnpm build` passes for all packages
- All API calls use `/api/v1/` prefix
- Extension login/register works against new backend
- Sync push/pull works with folders + pagination
- Share create/retrieve/meta/delete works

## Risk Assessment
- **Breaking extension**: API path changes break existing extension builds. Must update API package and rebuild extension together.
- **Type mismatches**: snake_case (API) vs camelCase (TS). ofetch handles JSON — field names must match server response. Keep snake_case in request bodies (server expects it), server returns snake_case too.
- **Sync client not using folders yet**: Client `@vaultic/sync` may not send folders. Empty array is fine — server handles gracefully.
