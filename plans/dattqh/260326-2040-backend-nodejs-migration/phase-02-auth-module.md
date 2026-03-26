# Phase 2: Auth Module

## Context
- [plan.md](./plan.md) | [phase-01](./phase-01-repo-restructure-backend-scaffold.md)
- Rust reference: `_archive/crates/vaultic-server/src/services/auth_service.rs`
- Rust middleware: `_archive/crates/vaultic-server/src/middleware/auth.rs`

## Overview
- **Priority:** P1
- **Status:** completed
- **Description:** Implement auth endpoints: register, login, refresh, /me, /password. Mongoose User model, JWT middleware, zod validation.

## Key Insights
- Rust uses HMAC-SHA256(auth_hash, jwt_secret) for server-side storage — port with `crypto.createHmac`
- JWT: access token 15min, refresh token 7d, HS256, claims: `{sub, iat, exp, tokenType}`
- Rust constant-time comparison via HMAC verify — Node.js `crypto.timingSafeEqual` for stored hash comparison
- New endpoints `/me` and `/password` not in Rust — simple additions

## Files to Create

```
backend/src/
├── models/
│   └── user-model.ts          # Mongoose User schema
├── services/
│   └── auth-service.ts        # register, login, refresh, getMe, changePassword
├── routes/
│   └── auth-route.ts          # POST register/login/refresh, GET me, PUT password
├── middleware/
│   └── auth-middleware.ts      # UPDATE: JWT Bearer extraction + validation
└── utils/
    └── jwt-utils.ts           # createToken, verifyToken helpers
```

## Mongoose User Model

```typescript
// backend/src/models/user-model.ts
const userSchema = new Schema({
  _id: { type: String, default: () => randomUUID() }, // Keep UUID, not ObjectId
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  authHash: { type: String, required: true }, // HMAC-SHA256(client_auth_hash, server_secret)
  encryptedSymmetricKey: { type: String, default: null },
  argon2Params: {
    type: { m: Number, t: Number, p: Number },
    default: { m: 65536, t: 3, p: 4 },
  },
}, { timestamps: true });
```

## Critical Logic: HMAC Server Hash

```typescript
// backend/src/services/auth-service.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

function hashForStorage(authHash: string, serverSecret: string): string {
  return createHmac('sha256', serverSecret)
    .update(authHash)
    .digest('hex');
}

function verifyHash(provided: string, stored: string): boolean {
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(stored, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

## Critical Logic: JWT

```typescript
// backend/src/utils/jwt-utils.ts
import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: string;      // userId (UUID)
  tokenType: 'access' | 'refresh';
}

export function createAccessToken(userId: string, secret: string, ttlMin: number): string {
  return jwt.sign({ sub: userId, tokenType: 'access' }, secret, { expiresIn: `${ttlMin}m` });
}

export function createRefreshToken(userId: string, secret: string, ttlDays: number): string {
  return jwt.sign({ sub: userId, tokenType: 'refresh' }, secret, { expiresIn: `${ttlDays}d` });
}
```

## Zod Schemas

```typescript
// Inline in auth-route.ts
const registerSchema = z.object({
  email: z.string().email(),
  auth_hash: z.string().min(1),
  encrypted_symmetric_key: z.string().optional(),
  argon2_params: z.object({ m: z.number(), t: z.number(), p: z.number() }).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  auth_hash: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const changePasswordSchema = z.object({
  current_auth_hash: z.string().min(1),
  new_auth_hash: z.string().min(1),
  new_encrypted_symmetric_key: z.string().optional(),
});
```

## Route Definitions

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/v1/auth/register` | No | register |
| POST | `/api/v1/auth/login` | No | login |
| POST | `/api/v1/auth/refresh` | No | refresh |
| GET | `/api/v1/auth/me` | Yes | getMe |
| PUT | `/api/v1/auth/password` | Yes | changePassword |

## Auth Middleware

```typescript
// backend/src/middleware/auth-middleware.ts
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (payload.tokenType !== 'access') return res.status(401).json({ error: 'expected access token' });
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}
```

## Implementation Steps

1. Create `backend/src/models/user-model.ts` with Mongoose schema
2. Create `backend/src/utils/jwt-utils.ts` with token helpers
3. Create `backend/src/services/auth-service.ts` with register/login/refresh/getMe/changePassword
4. Update `backend/src/middleware/auth-middleware.ts` with JWT extraction
5. Create `backend/src/routes/auth-route.ts` with zod validation + route handlers
6. Mount auth routes in `server.ts` at `/api/v1/auth`
7. Add `userId` to Express Request type declaration
8. Write tests for all auth flows

## Todo

- [x] Create User Mongoose model
- [x] Create JWT utility helpers
- [x] Implement auth service (register, login, refresh, getMe, changePassword)
- [x] Implement auth middleware (JWT Bearer validation)
- [x] Create auth routes with zod validation
- [x] Mount routes in server.ts
- [x] Extend Express Request type with userId
- [x] Manual tests: register, login, refresh, duplicate email, wrong password, expired token

## Success Criteria
- `POST /api/v1/auth/register` creates user, returns `{ user_id }`
- `POST /api/v1/auth/login` returns `{ access_token, refresh_token, user_id }`
- `POST /api/v1/auth/refresh` returns new access token
- `GET /api/v1/auth/me` returns user profile (authed)
- Invalid/expired tokens return 401
- Duplicate email returns 409
- All tests pass

## Security Considerations
- HMAC-SHA256 server hash — never store raw auth_hash
- `crypto.timingSafeEqual` for hash comparison — prevent timing attacks
- JWT secret from env, never hardcoded
- Token type check in middleware — refresh token cannot access protected routes
