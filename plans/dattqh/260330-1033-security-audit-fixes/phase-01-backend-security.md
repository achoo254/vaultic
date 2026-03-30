# Phase 1: Backend Security

## Context Links
- [Backend Audit](../reports/code-reviewer-260330-0936-backend-full-audit.md)
- [Adversarial Review](../reports/code-reviewer-260330-0941-adversarial-security-review.md)

## Overview
- **Priority:** P0 + P1
- **Status:** Completed
- **Effort:** 4h
- **Parallel-safe:** Yes — owns all `backend/src/**` files

## Items Covered

| # | ID | Severity | Issue |
|---|-----|----------|-------|
| 3 | B-C1/ADV-01 | P0 | Add tokenVersion, revoke on password change |
| 4 | B-C4 | P0 | Separate AUTH_HASH_KEY from JWT_SECRET |
| 8 | B-H2 | P1 | Configure trust proxy for nginx |
| 9 | B-C2 | P1 | Fix registration TOCTOU (catch E11000) |
| 13 | ADV-04 | P2 | Use bulkWrite({ ordered: false }), handle BulkWriteError |

## Key Insights

- `hashForStorage()` reuses `jwtSecret` as HMAC key — single compromise cascades
- `refresh()` never checks user existence or tokenVersion — deleted/banned user keeps access 7d
- `register()` does findOne+create TOCTOU — concurrent signup can duplicate
- `bulkWrite` uses default `ordered: true` — one failed insert kills entire batch
- `trust proxy` not set — rate limiter sees 127.0.0.1 for all users behind nginx

## Related Code Files

### Files to Modify
- `backend/src/models/user-model.ts` — add tokenVersion field
- `backend/src/services/auth-service.ts` — separate HMAC key, fix register, add tokenVersion logic
- `backend/src/config/env-config.ts` — add AUTH_HASH_KEY env var
- `backend/src/utils/jwt-utils.ts` — embed tokenVersion in JWT, pin algorithm
- `backend/src/middleware/auth-middleware.ts` — check tokenVersion on access token verify
- `backend/src/server.ts` — add trust proxy setting
- `backend/src/services/sync-service.ts` — bulkWrite ordered:false + error handling, fix itemType default

### Files to Create
- None

---

## Implementation Steps

### Item 3: Token Revocation (B-C1/ADV-01)

**Goal:** Password change invalidates all existing tokens.

**Step 1: Add tokenVersion to User model**
File: `backend/src/models/user-model.ts`
```typescript
// Add to IUser interface:
tokenVersion: number;

// Add to schema:
tokenVersion: { type: Number, default: 0 },
```

**Step 2: Embed tokenVersion in JWT**
File: `backend/src/utils/jwt-utils.ts`
```typescript
// Update TokenPayload interface:
export interface TokenPayload {
  sub: string;
  tokenType: "access" | "refresh";
  tokenVersion: number;  // NEW
  iat: number;
  exp: number;
}

// Update createAccessToken:
export function createAccessToken(userId: string, secret: string, ttlMin: number, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, tokenType: "access", tokenVersion },
    secret,
    { expiresIn: `${ttlMin}m`, algorithm: 'HS256' }  // pin algorithm
  );
}

// Update createRefreshToken:
export function createRefreshToken(userId: string, secret: string, ttlDays: number, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, tokenType: "refresh", tokenVersion },
    secret,
    { expiresIn: `${ttlDays}d`, algorithm: 'HS256' }
  );
}

// Update verifyToken — pin algorithm:
export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as TokenPayload;
}
```

**Step 3: Pass tokenVersion when creating tokens**
File: `backend/src/services/auth-service.ts`
- In `login()`: fetch `user.tokenVersion`, pass to `createAccessToken` and `createRefreshToken`
- In `refresh()`: lookup user from DB, verify exists AND `payload.tokenVersion === user.tokenVersion`
- In `changePassword()`: increment `user.tokenVersion` before save, return new tokens

```typescript
// refresh() — add user existence + tokenVersion check:
export async function refresh(refreshTokenStr: string) {
  const payload = verifyToken(refreshTokenStr, envConfig.jwtSecret);
  if (payload.tokenType !== "refresh") {
    throw AppError.unauthorized("expected refresh token");
  }
  const user = await User.findById(payload.sub).select("tokenVersion");
  if (!user) throw AppError.unauthorized("user not found");
  if (payload.tokenVersion !== user.tokenVersion) {
    throw AppError.unauthorized("token revoked");
  }
  const accessToken = createAccessToken(payload.sub, envConfig.jwtSecret, envConfig.accessTokenTtlMin, user.tokenVersion);
  return { access_token: accessToken };
}
```

```typescript
// changePassword() — increment tokenVersion + return new tokens:
export async function changePassword(userId, currentAuthHash, newAuthHash, newEncryptedSymmetricKey?) {
  // ... existing verification ...
  user.authHash = hashForStorage(newAuthHash);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  if (newEncryptedSymmetricKey !== undefined) {
    user.encryptedSymmetricKey = newEncryptedSymmetricKey;
  }
  await user.save();

  const accessToken = createAccessToken(userId, envConfig.jwtSecret, envConfig.accessTokenTtlMin, user.tokenVersion);
  const refreshToken = createRefreshToken(userId, envConfig.jwtSecret, envConfig.refreshTokenTtlDays, user.tokenVersion);
  return { message: "password updated", access_token: accessToken, refresh_token: refreshToken };
}
```

**Step 4: Check tokenVersion in auth middleware**
File: `backend/src/middleware/auth-middleware.ts`
```typescript
// In authRequired():
const payload = verifyToken(token, envConfig.jwtSecret);
if (payload.tokenType !== "access") throw AppError.unauthorized("expected access token");

// Check tokenVersion against DB
const user = await User.findById(payload.sub).select("tokenVersion");
if (!user || payload.tokenVersion !== user.tokenVersion) {
  throw AppError.unauthorized("token revoked");
}
req.userId = payload.sub;
```
Note: This adds a DB query per request. Acceptable for MVP — can optimize later with Redis cache.

---

### Item 4: Separate AUTH_HASH_KEY (B-C4)

**Step 1: Add to env config**
File: `backend/src/config/env-config.ts`
```typescript
authHashKey: requireEnv("AUTH_HASH_KEY"),
```

**Step 2: Use in hashForStorage**
File: `backend/src/services/auth-service.ts`
```typescript
function hashForStorage(authHash: string): string {
  return createHmac("sha256", envConfig.authHashKey).update(authHash).digest("hex");
}
```

**Step 3: Update .env.example**
Add `AUTH_HASH_KEY=<random-256bit-hex>` with comment explaining it must differ from JWT_SECRET.

**Migration note:** Existing user authHash values were computed with JWT_SECRET. Options:
- (a) One-time migration script to re-hash all users with new key — requires knowing old JWT_SECRET
- (b) Keep dual-read: try new key first, fallback to old key, re-hash on successful login
- **Recommended: (b)** — zero-downtime migration via lazy rehash

```typescript
// Lazy rehash in login():
function hashForStorage(authHash: string, key: string = envConfig.authHashKey): string {
  return createHmac("sha256", key).update(authHash).digest("hex");
}

// In login():
const providedHashNew = hashForStorage(authHash, envConfig.authHashKey);
const providedHashLegacy = hashForStorage(authHash, envConfig.jwtSecret);
const matchNew = verifyHash(providedHashNew, user.authHash);
const matchLegacy = !matchNew && verifyHash(providedHashLegacy, user.authHash);
if (!matchNew && !matchLegacy) throw AppError.unauthorized("invalid credentials");
// Lazy rehash if matched on legacy key
if (matchLegacy) {
  user.authHash = hashForStorage(authHash, envConfig.authHashKey);
  await user.save();
}
```

---

### Item 8: Trust Proxy (B-H2)

File: `backend/src/server.ts`
After `const app = express();`, add:
```typescript
// Trust first proxy (nginx) — required for correct req.ip in rate limiter
app.set('trust proxy', 1);
```

One line change. Low risk.

---

### Item 9: Registration TOCTOU (B-C2)

File: `backend/src/services/auth-service.ts`
Replace the `register()` function's findOne+create with try/catch on create:

```typescript
export async function register(email, authHash, encryptedSymmetricKey?, argon2Params?) {
  const serverHash = hashForStorage(authHash);
  try {
    const user = await User.create({
      email: email.toLowerCase().trim(),
      authHash: serverHash,
      encryptedSymmetricKey: encryptedSymmetricKey ?? null,
      ...(argon2Params && { argon2Params }),
    });
    return { user_id: user._id };
  } catch (err: any) {
    if (err.code === 11000) throw AppError.conflict("email already registered");
    throw err;
  }
}
```

Removes the `findOne` call entirely. The unique index on email handles the check atomically.

---

### Item 13: bulkWrite Error Handling (ADV-04)

File: `backend/src/services/sync-service.ts`

**Step 1: Add ordered:false to both bulkWrite calls**
```typescript
// Line 86:
if (folderOps.length > 0) await Folder.bulkWrite(folderOps, { ordered: false });

// Line 142:
if (itemOps.length > 0) await VaultItem.bulkWrite(itemOps, { ordered: false });
```

**Step 2: Wrap in try/catch for BulkWriteError**
```typescript
if (itemOps.length > 0) {
  try {
    await VaultItem.bulkWrite(itemOps, { ordered: false });
  } catch (err: any) {
    if (err.code === 11000 || err.name === 'MongoBulkWriteError') {
      // Partial success — remove failed IDs from acceptedItems
      const writeErrors = err.writeErrors || [];
      const failedIndices = new Set(writeErrors.map((e: any) => e.index));
      // Filter out items whose ops failed
      const opsWithIndex = itemOps.map((op, i) => ({ op, i }));
      const failedIds = new Set(
        opsWithIndex.filter(({ i }) => failedIndices.has(i))
          .map(({ op }) => {
            if ('insertOne' in op) return op.insertOne.document._id;
            if ('updateOne' in op) return op.updateOne.filter._id;
            return null;
          })
          .filter(Boolean)
      );
      // Remove failed IDs from accepted lists
      const newAccepted = acceptedItems.filter(id => !failedIds.has(id));
      acceptedItems.length = 0;
      acceptedItems.push(...newAccepted);
    } else {
      throw err;
    }
  }
}
```

**Step 3: Fix itemType default**
Line 130: Change `item.itemType ?? 1` to `item.itemType ?? 'login'`

**Step 4: Remove unused User import**
Line 3: Remove `import { User } from "../models/user-model.js";`

---

## Todo List

- [x] Add `tokenVersion` field to User model (user-model.ts)
- [x] Embed `tokenVersion` in JWT payload (jwt-utils.ts)
- [x] Pin JWT algorithm to HS256 (jwt-utils.ts)
- [x] Check tokenVersion in `refresh()` with DB lookup (auth-service.ts)
- [x] Check tokenVersion in `authRequired()` middleware (auth-middleware.ts)
- [x] Increment tokenVersion in `changePassword()` (auth-service.ts)
- [x] Return new tokens from `changePassword()` (auth-service.ts)
- [x] Add `AUTH_HASH_KEY` to env-config.ts
- [x] Switch `hashForStorage()` to use AUTH_HASH_KEY (auth-service.ts)
- [x] Implement lazy rehash for legacy hashes in `login()` (auth-service.ts)
- [x] Update `.env.example` with AUTH_HASH_KEY
- [x] Add `app.set('trust proxy', 1)` to server.ts
- [x] Replace findOne+create with try/catch E11000 in `register()` (auth-service.ts)
- [x] Add `ordered: false` to both bulkWrite calls (sync-service.ts)
- [x] Wrap bulkWrite in try/catch for BulkWriteError (sync-service.ts)
- [x] Fix itemType default: `1` -> `'login'` (sync-service.ts)
- [x] Remove unused User import (sync-service.ts)
- [x] Run `tsc --noEmit` in backend/
- [x] Run `pnpm test` in backend/

## Success Criteria

1. Password change returns new tokens and old tokens are rejected
2. AUTH_HASH_KEY is separate env var; legacy hashes lazy-migrated on login
3. Rate limiter correctly identifies client IP behind nginx
4. Concurrent registration with same email returns 409 (not duplicate user)
5. bulkWrite partial failure doesn't crash entire sync batch
6. `tsc --noEmit` passes, `pnpm test` passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| tokenVersion DB query per request adds latency | Medium | Low | ~5ms per request acceptable for MVP; can cache later |
| Lazy rehash breaks login for existing users | Low | High | Dual-read with fallback ensures backward compat |
| AUTH_HASH_KEY not set in production | Medium | High | requireEnv() will crash at startup with clear error |
| bulkWrite error handling misses edge cases | Low | Medium | ordered:false + catch covers the main failure mode |

## Security Considerations

- tokenVersion check adds defense against stolen refresh tokens
- Algorithm pinning prevents JWT algorithm confusion attacks
- Separate HMAC key limits blast radius of key compromise
- Trust proxy required for rate limiter to function at all in production

## Next Steps

- After deployment: verify existing users can still login (lazy rehash)
- Monitor DB latency from added tokenVersion query
- Phase 5 will modularize sync-service.ts (currently 213 lines)
