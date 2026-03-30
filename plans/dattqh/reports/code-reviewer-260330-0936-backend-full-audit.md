# Backend Full Security & Quality Audit

**Scope:** All 21 files in `backend/src/` (1,044 LOC)
**Date:** 2026-03-30
**Reviewer:** code-reviewer agent

---

## Overall Assessment

The backend is well-structured for an MVP: clean Route->Service->Model separation, Zod validation on all inputs, `express-async-errors` for auto-catch, timing-safe auth comparison, and bulkWrite for sync efficiency. However, several **security and correctness issues** need attention before production.

---

## CRITICAL Issues

### C1. Refresh Token Never Validates User Existence (auth-service.ts:57-64)
**Severity:** Critical | **Category:** Security/Auth

The `refresh()` function verifies the JWT signature but never checks if the user still exists in the database. A deleted/banned user can keep refreshing tokens indefinitely.

```typescript
// Current — no DB check
export async function refresh(refreshTokenStr: string) {
  const payload = verifyToken(refreshTokenStr, envConfig.jwtSecret);
  if (payload.tokenType !== "refresh") {
    throw AppError.unauthorized("expected refresh token");
  }
  const accessToken = createAccessToken(payload.sub, ...);
  return { access_token: accessToken };
}
```

**Fix:** Add `User.findById(payload.sub)` check. Also consider a token revocation list or storing refresh token hashes in the User document.

---

### C2. Race Condition in Registration — TOCTOU (auth-service.ts:24-33)
**Severity:** Critical | **Category:** Concurrency

`register()` does `findOne` then `create` — another request can register the same email between the two calls. The `unique: true` index on email will throw a raw MongoServerError (E11000) which is caught generically by the error handler as "duplicate key" but the timing window exists and the error message leaks implementation detail.

**Fix:** Remove the `findOne` pre-check. Rely solely on the unique index, catch E11000 specifically in the service:

```typescript
try {
  const user = await User.create({ ... });
  return { user_id: user._id };
} catch (err: any) {
  if (err.code === 11000) throw AppError.conflict("email already registered");
  throw err;
}
```

---

### C3. Share Metadata Creation — TOCTOU Race + Client-Controlled ID (share-service.ts:26-48)
**Severity:** Critical | **Category:** Security + Concurrency

Two issues combined:

1. **TOCTOU:** `findById` then `create` has a race window. Two simultaneous requests with the same `share_id` can both pass the existence check.
2. **Client-controlled `_id`:** The `createMetadataShareSchema` lets the client provide `share_id` (8-24 chars, no format restriction). An attacker can enumerate/squat predictable IDs or overwrite shares if the race window is hit.

**Fix:** Use `insertOne` with the desired `_id` and catch duplicate key error. Also, enforce the share ID to be cryptographically random (server-generated) or at minimum validate it matches a strict pattern (e.g., base62 of sufficient length).

---

### C4. HMAC Key Reuse — JWT Secret Used for Auth Hash Storage (auth-service.ts:7-9)
**Severity:** Critical | **Category:** Security/Crypto

`hashForStorage()` uses `envConfig.jwtSecret` as the HMAC key. This couples two unrelated cryptographic operations. If JWT_SECRET is leaked (e.g., via a JWT algorithm confusion attack or log exposure), all stored auth hashes are compromised. If the auth hash derivation is compromised, JWTs can be forged.

**Fix:** Use a separate `AUTH_HASH_KEY` environment variable. Different secrets for different purposes is a fundamental crypto hygiene practice.

---

## IMPORTANT Issues

### I1. No Rate Limiting on Share Endpoints (share-route.ts)
**Severity:** Important | **Category:** Security/DoS

Auth routes have rate limiting, but share routes have none. An attacker can:
- Brute-force share IDs via `GET /api/v1/shares/:id`
- Spam `POST /api/v1/shares/metadata` to create unlimited shares (especially since `authOptional` allows anonymous access)
- Exhaust MongoDB storage with unlimited share creation

**Fix:** Add `rateLimit()` to all share routes. The metadata creation endpoint (anonymous) needs aggressive limiting.

---

### I2. No Rate Limiting on Sync Endpoints (sync-route.ts)
**Severity:** Important | **Category:** Security/DoS

Sync push accepts up to 500 items + 200 folders per request with no rate limit. An authenticated user can hammer the server with large payloads.

**Fix:** Add rate limiting: e.g., `rateLimit(60_000, 30)` for push.

---

### I3. Memory Leak in Rate Limiter (rate-limit-middleware.ts:3)
**Severity:** Important | **Category:** Performance

The in-memory `Map` store grows unbounded between cleanup intervals (5 min). Under high traffic or a DDoS attack, memory can spike significantly. The cleanup only runs every 5 minutes, so a burst of unique IPs within a window accumulates entries.

**Fix:** For MVP this is acceptable, but add a max-size guard:

```typescript
if (store.size > 100_000) {
  // Emergency cleanup: remove oldest entries
  const now = Date.now();
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key);
  }
}
```

---

### I4. `req.ip` Spoofable Behind Proxy (rate-limit-middleware.ts:10)
**Severity:** Important | **Category:** Security

`req.ip` returns the socket IP by default. Behind nginx (production uses nginx), this will always be `127.0.0.1` unless `app.set('trust proxy', ...)` is configured. This makes rate limiting useless in production — all users share one bucket.

**Fix:** In `server.ts`, add `app.set('trust proxy', 1)` (or the specific proxy count). Also validate `X-Forwarded-For` is from trusted sources.

---

### I5. Pull Query Doesn't Paginate Folders (sync-service.ts:177-180)
**Severity:** Important | **Category:** Performance

Items are paginated (`limit + 1` pattern), but folders are fetched ALL AT ONCE with no limit. A user with thousands of folders will get them all in every pull response.

**Fix:** Apply the same pagination/limit to the folder query, or at minimum add a `.limit(1000)` safety cap.

---

### I6. `verifyToken` Cast Without Validation (jwt-utils.ts:18-19)
**Severity:** Important | **Category:** Type Safety

```typescript
export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}
```

The `as TokenPayload` cast trusts that `sub` and `tokenType` exist. A malformed/legacy token missing these fields will pass through and cause undefined behavior downstream. Also, `jwt.verify` with a string secret allows both HMAC and `none` algorithm by default in older versions.

**Fix:** Validate the decoded payload shape with Zod or manual checks. Specify algorithm explicitly:

```typescript
return jwt.verify(token, secret, { algorithms: ['HS256'] }) as TokenPayload;
```

---

### I7. Change Password Doesn't Invalidate Existing Tokens (auth-service.ts:80-101)
**Severity:** Important | **Category:** Security

After changing password, all previously issued access and refresh tokens remain valid until expiry. An attacker with a stolen token retains access even after password change.

**Fix:** Implement a `tokenVersion` or `passwordChangedAt` field on User. Check this in `authRequired` middleware. Alternatively, store refresh tokens and revoke them on password change.

---

### I8. Error Handler Placed After 404 Catch-All (server.ts:38-43)
**Severity:** Important | **Category:** Architecture/Bug

```typescript
// 5. 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

// 6. Error handler (last)
app.use(errorHandler);
```

The 404 handler is a regular middleware (not an error handler — it has 2 params, not 4). Since it always sends a response, `errorHandler` will never be reached for unmatched routes. **However**, `express-async-errors` wraps route handlers to pass errors to `next()`, so errors thrown in actual routes DO reach the error handler. This is correct for route errors, but if any middleware after the routes throws, it won't reach the error handler.

This is technically fine for current code but fragile. Consider reordering or making the 404 handler explicitly call `next()` for unhandled cases.

---

### I9. Response Format Inconsistency
**Severity:** Important | **Category:** API Contract

The documented standard is `{ success: true, data }` / `{ success: false, error: { code, message } }`. But actual responses use:
- `res.json(result)` — no `success` wrapper
- `res.json({ error: "..." })` — no `code` field
- `res.status(404).json({ error: "not found" })` — flat error string

**Fix:** Standardize all responses through a response wrapper utility, or update the documented standard to match reality.

---

## MEDIUM Issues

### M1. `itemType` Default Mismatch (sync-service.ts:130 vs vault-item-model.ts:21)
**Category:** Bug

Model default: `'login'` (string). Sync service insert default: `1` (number). These are different types and values.

```typescript
// vault-item-model.ts
itemType: { type: String, default: 'login' },

// sync-service.ts line 130
itemType: item.itemType ?? 1,  // BUG: should be 'login'
```

---

### M2. `sync-service.ts` Exceeds 200-Line Limit (212 lines)
**Category:** Code Standards

File is 212 lines, exceeding the 200-line project standard.

**Fix:** Extract the push item/folder processing into helper functions in a separate file.

---

### M3. Unused Import — `User` in sync-service.ts:3
**Category:** Code Quality

`User` model is imported but never used in sync-service.ts.

---

### M4. Share ID Generation Bias (secure-share-model.ts:21)
**Category:** Security/Minor

```typescript
const bytes = randomBytes(SHARE_ID_LEN);
return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
```

`256 % 62 = 8` — the first 8 characters of ID_CHARS have a slightly higher probability (~1.6% each vs ~1.5% for others). This is a minor bias. For a 12-char ID the effective entropy is still ~71 bits which is adequate, but the bias is unnecessary.

**Fix:** Use rejection sampling or `crypto.randomInt(62)`.

---

### M5. No Input Size Limit on `encryptedData` Fields
**Category:** Security/DoS

The Zod schemas validate `encryptedData: z.string().min(1)` but set no max length. An attacker could send a multi-GB encrypted blob. The `express.json({ limit: "1mb" })` body parser limit provides some protection, but the 1MB limit may still be too generous for individual items.

**Fix:** Add `.max(1_000_000)` (or appropriate ceiling) to encrypted data fields in Zod schemas.

---

### M6. `deleteShare` Uses Wrong Error Code (share-service.ts:142)
**Category:** API Contract

Returns `AppError.unauthorized` (401) for "not the share owner". This should be `AppError.notFound` (404) — to avoid revealing the share exists — or `403 Forbidden`. 401 means "not authenticated" which is incorrect since the user IS authenticated, just not authorized.

**Fix:** Add `AppError.forbidden(msg)` static method and use 403, or return 404 to hide existence.

---

### M7. CORS `origin: false` When CORS_ORIGIN Not Set (server.ts:20)
**Category:** Security

When `CORS_ORIGIN` env var is not set, `origin` becomes `false`, which disables CORS entirely (no cross-origin requests allowed). This is actually secure but could be confusing in development. There's no documentation about this behavior.

---

### M8. Mongoose Connection Has No Error Handling Options (server.ts:47)
**Category:** Reliability

`mongoose.connect()` is called without timeout, retry, or connection pool options. In production, MongoDB connection issues could cause the server to hang on startup indefinitely.

**Fix:** Add connection options:
```typescript
await mongoose.connect(envConfig.mongodbUri, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
});
```

---

## MINOR Issues

### m1. No `helmet` or Security Headers
Standard security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.) are not set. Consider adding `helmet` middleware.

### m2. Health Endpoint Leaks Uptime
`process.uptime()` reveals server restart times, potentially useful for timing attacks or reconnaissance.

### m3. `console.error` in Error Handler (error-handler-middleware.ts:29)
Should use the pino `logger.error()` instead of `console.error` for consistent structured logging.

### m4. No Request ID Tracking
No correlation ID for request tracing. Consider adding `X-Request-Id` header propagation.

### m5. No Graceful Shutdown Timeout (server.ts:55-62)
`server.close()` waits for existing connections but has no timeout. A hanging connection can prevent shutdown indefinitely.

---

## Positive Observations

1. **Timing-safe comparison** for auth hash verification — prevents timing attacks
2. **Zod validation** on all request bodies and query params — solid input validation
3. **express-async-errors** — no manual try/catch needed in route handlers
4. **bulkWrite** in sync push — efficient batch operations, no N+1
5. **TTL index** on SecureShare expiresAt — automatic cleanup by MongoDB
6. **Atomic `findOneAndUpdate`** for share view counting — prevents race conditions on view counts
7. **Clean separation** of concerns: routes are thin, services contain business logic
8. **TypeScript strict mode** enabled
9. **Lean queries** used appropriately for read-only operations

---

## Summary Table

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| C1 | Critical | Auth | Refresh token doesn't verify user exists |
| C2 | Critical | Concurrency | Registration TOCTOU race on email |
| C3 | Critical | Security+Race | Share metadata client-controlled ID + TOCTOU |
| C4 | Critical | Crypto | JWT secret reused as HMAC key for auth hash |
| I1 | Important | DoS | No rate limit on share endpoints |
| I2 | Important | DoS | No rate limit on sync endpoints |
| I3 | Important | Performance | Rate limiter memory growth |
| I4 | Important | Security | req.ip spoofable, trust proxy not set |
| I5 | Important | Performance | Folder pull unbounded (no pagination) |
| I6 | Important | Type Safety | JWT verify cast without validation + no algo pin |
| I7 | Important | Security | Password change doesn't invalidate tokens |
| I8 | Important | Architecture | Error handler ordering fragility |
| I9 | Important | API Contract | Response format doesn't match documented standard |
| M1 | Medium | Bug | itemType default mismatch (1 vs 'login') |
| M2 | Medium | Standards | sync-service.ts exceeds 200 lines |
| M3 | Medium | Code Quality | Unused User import in sync-service |
| M4 | Medium | Security | Share ID generation bias |
| M5 | Medium | DoS | No max length on encryptedData |
| M6 | Medium | API Contract | deleteShare uses 401 instead of 403/404 |
| M7 | Medium | Config | CORS behavior undocumented |
| M8 | Medium | Reliability | No MongoDB connection options |

---

**Recommended Priority:**
1. Fix C1 (refresh token) + C4 (key separation) — immediate security risk
2. Fix C2 + C3 (race conditions) — data integrity
3. Add rate limiting to share + sync routes (I1, I2)
4. Configure trust proxy (I4) — rate limiting broken without it
5. Pin JWT algorithm (I6) — defense in depth
6. Fix M1 (itemType bug) — data corruption
7. Address remaining items by priority

**Status:** DONE
**Summary:** Full backend audit complete. 4 critical, 9 important, 8 medium, 5 minor issues found. Most critical: refresh token bypass, HMAC key reuse, and two TOCTOU race conditions.
