import type { Request, Response, NextFunction } from "express";

const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter. No Redis dependency for MVP.
 */
export function rateLimit(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.baseUrl}${req.path}:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: "too many requests" });
      return;
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
}, 5 * 60_000).unref();
