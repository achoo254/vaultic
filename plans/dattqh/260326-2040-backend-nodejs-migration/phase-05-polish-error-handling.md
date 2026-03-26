# Phase 5: Polish & Error Handling

## Context
- [plan.md](./plan.md) | Depends on phases 2-4
- Rust reference: `_archive/crates/vaultic-server/src/error.rs`, `main.rs`

## Overview
- **Priority:** P2
- **Status:** completed
- **Description:** Global error middleware, rate limiting, request logging, CORS, input sanitization.

## Files to Create

```
backend/src/
├── middleware/
│   ├── error-handler-middleware.ts   # Global error → JSON response
│   ├── rate-limit-middleware.ts      # Rate limiting on auth endpoints
│   └── request-logger-middleware.ts  # pino-http integration
└── utils/
    └── validate-request.ts          # Reusable zod validation helper
```

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/server.ts` | Add middleware stack in correct order |
| `backend/src/routes/auth-route.ts` | Apply rate limiter |

## Implementation Steps

### 1. Global Error Handler Middleware

```typescript
// backend/src/middleware/error-handler-middleware.ts
import { AppError } from '../utils/app-error.js';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Mongoose duplicate key (E11000)
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    return res.status(409).json({ error: 'duplicate key' });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'validation failed', details: (err as any).issues });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'internal server error' });
}
```

### 2. Zod Validation Helper

```typescript
// backend/src/utils/validate-request.ts
import { ZodSchema } from 'zod';
import { AppError } from './app-error.js';

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw AppError.badRequest(msg);
  }
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw AppError.badRequest(msg);
  }
  return result.data;
}
```

### 3. Rate Limiting

```typescript
// backend/src/middleware/rate-limit-middleware.ts
// Simple in-memory rate limiter (no Redis dependency for MVP)
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'too many requests' });
    }

    entry.count++;
    next();
  };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key);
  }
}, 5 * 60_000);
```

Apply to auth routes:
- `/register`: 5 req / 15 min per IP
- `/login`: 10 req / 15 min per IP
- `/refresh`: 30 req / 15 min per IP

### 4. Request Logging (pino-http)

```typescript
// backend/src/middleware/request-logger-middleware.ts
import pinoHttp from 'pino-http';
import pino from 'pino';

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export const requestLogger = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
```

### 5. CORS Configuration

```typescript
// In server.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
```

### 6. Health Check Enhancement

```typescript
// Update health-route.ts
router.get('/api/v1/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const status = mongoOk ? 200 : 503;
  res.status(status).json({
    status: mongoOk ? 'ok' : 'degraded',
    mongo: mongoOk ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});
```

### 7. Middleware Stack Order in server.ts

```typescript
// 1. Request logger (first — logs all requests)
app.use(requestLogger);
// 2. CORS
app.use(cors(corsOptions));
// 3. Body parser
app.use(express.json({ limit: '1mb' }));
// 4. Routes (rate limiting applied per-route)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/shares', shareRoutes);
app.use('/api/v1/health', healthRoutes);
app.get('/s/:id', serveSharePage);
// 5. 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
// 6. Error handler (last)
app.use(errorHandler);
```

## Todo

- [x] Create global error handler middleware
- [x] Create zod validation helper (validateBody, validateQuery)
- [x] Refactor routes to use validation helper
- [x] Create in-memory rate limiter
- [x] Apply rate limits to auth endpoints
- [x] Integrate pino-http request logging
- [x] Configure CORS (env-driven origins)
- [x] Enhance health check (mongo status + uptime)
- [x] Set correct middleware stack order in server.ts
- [x] Add body size limit (1mb)
- [x] Add 404 catch-all route
- [x] Manual test: invalid JSON body returns 400
- [x] Manual test: rate limit returns 429 + Retry-After header
- [x] Manual test: unknown route returns 404

## Success Criteria
- All errors return consistent `{ error: "message" }` JSON
- Rate limiting blocks brute-force auth attempts
- Request logging excludes health checks
- CORS headers present in responses
- No unhandled promise rejections crash the server

## Risk Assessment
- **In-memory rate limiter**: Resets on restart, not shared across instances. Acceptable for single-instance MVP. Upgrade to Redis later if needed.
- **Body size limit**: 1mb covers encrypted vault items. May need increase for bulk sync push.
