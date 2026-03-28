import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt-utils.js";
import { envConfig } from "../config/env-config.js";
import { AppError } from "../utils/app-error.js";

/**
 * JWT Bearer token extraction + validation.
 * Sets req.userId on success.
 */
export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("missing token");
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token, envConfig.jwtSecret);
    if (payload.tokenType !== "access") {
      throw AppError.unauthorized("expected access token");
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized("invalid token");
  }
}

/**
 * Optional JWT auth — sets req.userId if valid token present, otherwise continues.
 */
export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token, envConfig.jwtSecret);
    if (payload.tokenType === "access") {
      req.userId = payload.sub;
    }
  } catch {
    // Invalid token — continue without auth
  }
  next();
}
