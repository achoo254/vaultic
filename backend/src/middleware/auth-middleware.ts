import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt-utils.js";
import { envConfig } from "../config/env-config.js";
import { AppError } from "../utils/app-error.js";
import { User } from "../models/user-model.js";

/**
 * JWT Bearer token extraction + validation.
 * Validates tokenVersion against DB to support token revocation.
 * Sets req.userId on success.
 */
export async function authRequired(req: Request, _res: Response, next: NextFunction) {
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

    // DB check: verify tokenVersion to detect revoked tokens (e.g. after password change)
    const user = await User.findById(payload.sub).select("tokenVersion");
    if (!user || payload.tokenVersion !== user.tokenVersion) {
      throw AppError.unauthorized("token revoked");
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
