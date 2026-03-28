# Vaultic: Code Standards & Structure

## Directory Structure

```
vaultic/
├── backend/                      # Node.js/Express/TypeScript server
│   ├── src/
│   │   ├── server.ts             # Express app + MongoDB setup
│   │   ├── config/
│   │   │   └── env-config.ts     # Environment variables (MONGODB_URI, JWT_SECRET, etc)
│   │   ├── routes/
│   │   │   ├── auth-route.ts     # Auth endpoints
│   │   │   ├── health-route.ts   # Health probe
│   │   │   ├── sync-route.ts     # Sync endpoints
│   │   │   └── share-route.ts    # Share endpoints
│   │   ├── models/
│   │   │   ├── user-model.ts     # User schema
│   │   │   ├── vault-item-model.ts
│   │   │   ├── folder-model.ts
│   │   │   └── secure-share-model.ts
│   │   ├── services/
│   │   │   ├── auth-service.ts   # Business logic
│   │   │   ├── sync-service.ts
│   │   │   └── share-service.ts
│   │   ├── middleware/
│   │   │   ├── auth-middleware.ts
│   │   │   ├── error-handler-middleware.ts
│   │   │   ├── rate-limit-middleware.ts
│   │   │   └── request-logger-middleware.ts
│   │   ├── utils/
│   │   │   ├── app-error.ts      # Custom error class
│   │   │   ├── jwt-utils.ts      # Token management
│   │   │   └── validate-request.ts
│   │   ├── types/
│   │   │   └── express.d.ts      # Express type extensions
│   │   └── static/               # Share page HTML
│   ├── dist/                     # Compiled output
│   └── package.json
│
├── client/                       # Client-side TypeScript
│   ├── apps/
│   │   └── extension/            # WXT browser extension
│   │       ├── src/entrypoints/
│   │       │   ├── popup/        # 380x520px popup UI
│   │       │   ├── background.ts
│   │       │   └── content.ts
│   │       └── wxt.config.ts
│   │
│   └── packages/
│       ├── api/                  # @vaultic/api (ofetch client)
│       ├── crypto/               # @vaultic/crypto (WebCrypto)
│       ├── storage/              # @vaultic/storage (IndexedDB)
│       ├── sync/                 # @vaultic/sync (delta sync)
│       └── ui/                   # @vaultic/ui (React components)
│
├── shared/types/                 # @vaultic/types (shared)
├── docker/
│   ├── Dockerfile                # Node.js 22 Alpine
│   └── docker-compose.yml        # Backend only
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
└── docs/                         # Documentation
```

---

## Naming Conventions

### TypeScript/JavaScript

**Packages:** kebab-case within scope
- `@vaultic/api`, `@vaultic/crypto`, `@vaultic/storage`, `@vaultic/sync`
- `@vaultic/ui`, `@vaultic/types`, `@vaultic/extension`, `@vaultic/backend`

**Files:** kebab-case (descriptive purpose)
- Components: `auth-route.ts`, `user-model.ts`, `jwt-utils.ts`
- Services: `auth-service.ts`, `sync-service.ts`
- Middleware: `auth-middleware.ts`, `error-handler-middleware.ts`
- Utilities: `validate-request.ts`, `app-error.ts`

**Exports:** PascalCase for classes, camelCase for functions
```typescript
// authRoute.ts
export const authRoute = Router(); // Route handler
export class AppError extends Error { }  // Custom error
export function validateEmail(email: string): boolean { } // Utility
```

**Types/Interfaces:** PascalCase
- `User`, `VaultItem`, `LoginRequest`, `SyncDelta`, `SecureShare`

**Constants:** SCREAMING_SNAKE_CASE or camelCase (readonly)
```typescript
export const MAX_PASSWORD_LENGTH = 128;
export const JWT_ALGORITHM = 'HS256';
```

**Database:** Collection names lowercase + plural
- Collections: `users`, `vaultitems`, `folders`, `secureshares`
- Fields: camelCase (`userId`, `createdAt`, `passwordHash`)

**File size:** Keep under 150 lines; split larger modules

---

## Backend Code Standards (Node.js/Express)

### Express Route Structure

```typescript
// routes/auth-route.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth-service';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export const authRoute = router;
```

**Principles:**
- Routes: Define path + handler
- Handler: Parse request → call service → send response
- Error: Catch and pass to middleware via `next(error)`
- Type request body with `req.body`
- No business logic in routes (extract to services)

### Mongoose Models

```typescript
// models/user-model.ts
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // createdAt, updatedAt auto
);

export const User = mongoose.model('User', userSchema);
```

**Principles:**
- Schema: Define fields + validation
- Types: Use `mongoose.Schema` + field types
- Timestamps: Enable auto `createdAt`, `updatedAt`
- Indexes: Add for frequently queried fields (email unique)
- No business logic in models (use services)

### Services (Business Logic)

```typescript
// services/auth-service.ts
import { User } from '../models/user-model';
import { hashPassword, verifyPassword } from '../utils/jwt-utils';
import { generateToken } from '../utils/jwt-utils';
import { AppError } from '../utils/app-error';

export const authService = {
  async register(email: string, password: string) {
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 'EMAIL_EXISTS', 409);

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash });

    const token = generateToken({ userId: user._id, email: user.email });
    return { user: user.toObject(), token };
  },

  async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) throw new AppError('Invalid credentials', 'AUTH_FAILED', 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 'AUTH_FAILED', 401);

    const token = generateToken({ userId: user._id, email: user.email });
    return { user: user.toObject(), token };
  },
};
```

**Principles:**
- Single responsibility: handle one domain (auth, sync, share)
- Async/await: all DB operations async
- Error handling: throw AppError with code + status
- No request/response in services (only data)
- Testable: inject dependencies if needed

### Custom Error Class

```typescript
// utils/app-error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

### Middleware Stack

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler-middleware';
import { authMiddleware } from './middleware/auth-middleware';

const app = express();

// Order matters
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(rateLimiter);

// Public routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/shares', shareRoute); // GET public share

// Protected routes
app.use('/api/v1', authMiddleware); // Verify JWT here
app.use('/api/v1/sync', syncRoute);
app.use('/api/v1/shares', shareRoute); // DELETE/POST (protected)

// Error handler (must be last)
app.use(errorHandler);
```

**Middleware order:**
1. CORS
2. Body parser
3. Logger
4. Rate limiter
5. Public routes
6. Auth middleware (protected routes after this)
7. Error handler (last)

### Error Handling Middleware

```typescript
// middleware/error-handler-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  logger.error({ statusCode, code, message, err });

  res.status(statusCode).json({
    success: false,
    error: { code, message },
    data: null,
  });
};
```

### Authentication Flow

```typescript
// middleware/auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt-utils';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing token', 'NO_TOKEN', 401);
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    // Extend Express Request type
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (error) {
    next(new AppError('Invalid token', 'INVALID_TOKEN', 401));
  }
};

// Type extension in types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}
```

### Environment Configuration

```typescript
// config/env-config.ts
import 'dotenv/config';

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vaultic',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-not-for-prod',
    accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL_MIN || '15'),
    refreshTokenTtl: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7'),
  },
  server: {
    port: parseInt(process.env.SERVER_PORT || '8080'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validation
if (!config.jwt.secret || config.jwt.secret === 'dev-secret-not-for-prod') {
  if (config.server.nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}
```

---

## Client Code Standards (TypeScript)

### Type Definitions

```typescript
// types/index.ts — Always explicit types, no 'any'
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface VaultItem {
  id: string;
  userId: string;
  type: 'password' | 'note' | 'card' | 'identity';
  title: string;
  ciphertext: string; // base64 AES-256-GCM
  timestamp: Date;
}

export interface SyncDelta {
  id: string;
  itemId: string;
  encrypted: string;
  timestamp: Date;
}
```

### Async/Await Patterns

```typescript
// ✅ Prefer async/await
async function syncVault() {
  try {
    const deltas = await fetchDeltas();
    await applyDeltas(deltas);
  } catch (error) {
    logger.error('Sync failed', error);
    throw error;
  }
}

// ❌ Avoid .then() chains
function syncVault() {
  return fetchDeltas()
    .then(applyDeltas)
    .catch(err => logger.error('Sync failed', err));
}
```

### Design Tokens (MANDATORY for UI)

```typescript
// All UI must use tokens from @vaultic/ui/styles/design-tokens.ts
import { colors, spacing, typography } from '@vaultic/ui/styles/design-tokens';

// ❌ DON'T hardcode colors
const Button = styled.button`
  background-color: #2563EB;
  padding: 8px 16px;
`;

// ✅ DO use tokens
const Button = styled.button`
  background-color: ${colors.primary};
  padding: ${spacing.sm} ${spacing.md};
  font-family: ${typography.fontFamily};
`;
```

### Testing (Vitest)

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Filter by package
pnpm --filter @vaultic/crypto test

# Coverage
pnpm test --coverage

# Single file
pnpm test src/__tests__/crypto.test.ts
```

**Test Structure:**
- Location: `src/__tests__/{feature}.test.ts`
- Framework: Vitest (ESM-native, TypeScript support)
- Covered packages: crypto, storage, sync, api (84+ tests)

### Error Handling

```typescript
class VaultError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
  }
}

async function encryptVault(password: string) {
  try {
    // ...
  } catch (error) {
    if (error instanceof Error) {
      throw new VaultError(
        `Encryption failed: ${error.message}`,
        'ENC_FAILED',
        { originalError: error }
      );
    }
    throw error;
  }
}
```

---

## Build & Deploy

### Backend Build

```bash
cd backend

# Install
pnpm install

# Dev (tsx watch — hot reload)
pnpm dev

# Build (TypeScript → JavaScript)
pnpm build

# Production start
pnpm start

# PM2 cluster mode
pnpm start:pm2
```

### Client Build

```bash
# Build all packages (Turbo caching)
pnpm build

# Build single package
pnpm --filter @vaultic/crypto build

# Dev mode (watch)
pnpm dev

# Extension dev (hot reload)
pnpm --filter @vaultic/extension dev
```

### Docker

```bash
docker build -f docker/Dockerfile -t vaultic:latest .
docker compose -f docker/docker-compose.yml up -d
```

---

## API Contract Standards

### Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials"
  }
}
```

### Auth Endpoints
- `POST /api/v1/auth/register` — Email + password → JWT
- `POST /api/v1/auth/login` — Email + password → JWT
- `POST /api/v1/auth/refresh` — Refresh token → new JWT
- `POST /api/v1/auth/logout` — Invalidate token
- `GET /api/v1/auth/me` — User profile (Bearer required)

### Protected Routes Header
```
Authorization: Bearer <jwt_token>
```

---

## Database Standards (MongoDB/Mongoose)

### Collection Naming
- Lowercase + plural: `users`, `vaultitems`, `folders`, `secureshares`

### Field Naming
- camelCase: `userId`, `createdAt`, `passwordHash`
- Reserved: `_id` (ObjectId auto), `__v` (version)

### Schema Validation
```typescript
const schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+@.+/,
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 60,
  },
});
```

### Query Patterns
```typescript
// ✅ Use async/await
const user = await User.findById(userId);
const items = await VaultItem.find({ userId });

// ✅ Use indexes for frequently queried fields
userSchema.index({ email: 1 });

// ❌ Avoid raw MongoDB commands in service layer
```

---

## Security Standards

### Password Hashing
- Use bcrypt with salt rounds 10+
- Never log passwords or hashes (only error codes)
- Constant-time comparison for verification

### JWT Tokens
- Algorithm: HS256
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Stored in Authorization header: `Bearer <token>`

### Encryption Keys
- Master key: Argon2id (client-side)
- Encryption key: HKDF-SHA256 derived
- Vault items: AES-256-GCM encrypted
- Keys never logged (only success/failure codes)

### API Security
- CORS: Restrict to extension origins
- HTTPS: Required in production (nginx enforces)
- Rate limiting: 100 req/min per IP on auth endpoints
- Input validation: Zod schemas on all routes

### Secrets Management
- `.env` file: **NEVER** commit
- `.env.example`: Template only (no real values)
- CI/CD: GitLab CI masked secrets
- Production: Environment variables or secrets manager

---

## Testing Standards

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { encryptItem, decryptItem } from '@vaultic/crypto';

describe('encryptItem', () => {
  let encKey: CryptoKey;

  beforeEach(async () => {
    encKey = await generateEncryptionKey();
  });

  it('should encrypt and decrypt correctly', async () => {
    const plaintext = { username: 'user', password: 'secret' };
    const ciphertext = await encryptItem(plaintext, encKey);
    const decrypted = await decryptItem(ciphertext, encKey);
    expect(decrypted).toEqual(plaintext);
  });

  it('should produce different ciphertexts (random nonce)', async () => {
    const ct1 = await encryptItem({ username: 'user' }, encKey);
    const ct2 = await encryptItem({ username: 'user' }, encKey);
    expect(ct1).not.toBe(ct2);
  });
});
```

### Coverage Requirements
- Minimum 70% line coverage for new code
- 100% for crypto modules (critical path)
- Integration tests for sync (delta merge, conflict resolution)

### Linting

```bash
pnpm lint              # Check all packages
pnpm lint --fix        # Auto-fix issues
```

**ESLint Config:**
- `@typescript-eslint/recommended`
- No `any` types, no unused variables
- No implicit `unknown`

---

## Git & Commits

### Branch Naming
- Feature: `feature/vault-crud`, `feature/autofill`
- Bug: `fix/sync-conflict`, `fix/auth-token-leak`
- Docs: `docs/api-documentation`
- Chore: `chore/upgrade-deps`

### Commit Messages (Conventional)

```
feat: add vault item encryption
fix: resolve sync conflict on multi-device update
docs: update API endpoint documentation
test: add crypto roundtrip tests
chore: upgrade express to 4.19
refactor: extract password-gen into separate module
```

### Pre-commit Checks

```bash
# Before git push:
pnpm lint && pnpm test && pnpm build
```

---

## Code Review Checklist

- [ ] Code compiles/builds without errors
- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type safety: no `any` types
- [ ] Error handling: throw AppError, no unwraps
- [ ] Security: no hardcoded secrets, HTTPS/auth enforced
- [ ] Documentation: public API has comments
- [ ] Design tokens used (UI only)
- [ ] Commit messages follow conventional format

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Vault search | <200ms | 10K items, IndexedDB |
| Form auto-fill | <1s | Content script + DOM injection |
| Sync push | <2s | 100 item deltas, encrypted |
| Sync pull | <2s | Decrypt + merge (LWW) |
| Key derivation | <1s | Argon2id on weak CPU |
| Login | <500ms | bcrypt verify |

---

## File Size Limits

| Type | Limit | Action |
|------|-------|--------|
| Backend file | 150 lines | Split into services/utils/routes |
| TS file | 200 lines | Extract components/utilities |
| Markdown doc | 800 lines | Split into topic directories |
| Route handler | 40 lines | Move logic to services |

---

## Dependencies Management

### Principle: YAGNI
- Add only when actively needed
- Prefer Node.js built-ins and WebCrypto
- Avoid bloat: review `pnpm audit`, `pnpm list`

### Version Pinning

```json
{
  "dependencies": {
    "express": "4.18",
    "mongoose": "8.0"
  }
}
```

### Update Frequency
- Monthly: `pnpm update` check
- Security alerts: Immediate response
- Review breaking changes before merge

---

## Deployment Checklist

- [ ] All tests pass
- [ ] Linting passes
- [ ] No `console.log` in production code
- [ ] Secrets use `.env` variables
- [ ] HTTPS enabled
- [ ] CORS correctly scoped
- [ ] MongoDB connection string validated
- [ ] Docker image builds successfully
- [ ] CI/CD pipeline passes

---

**Last updated: 2026-03-27**
**Backend: Node.js/Express/MongoDB | Client: TypeScript/React**
**Testing: Vitest 84+ tests across 4 packages**
