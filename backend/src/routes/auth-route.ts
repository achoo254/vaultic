import { Router, type Router as RouterType } from "express";
import { z } from "zod";
import * as authService from "../services/auth-service.js";
import { authRequired } from "../middleware/auth-middleware.js";
import { rateLimit } from "../middleware/rate-limit-middleware.js";
import { envConfig } from "../config/env-config.js";
import { AppError } from "../utils/app-error.js";

const FIFTEEN_MIN = 15 * 60_000;

export const authRouter: RouterType = Router();

const registerSchema = z.object({
  email: z.string().email(),
  auth_hash: z.string().regex(/^[a-f0-9]{64}$/i, "must be a 64-char hex string"),
  encrypted_symmetric_key: z.string().optional(),
  argon2_params: z.object({ m: z.number(), t: z.number(), p: z.number() }).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  auth_hash: z.string().regex(/^[a-f0-9]{64}$/i, "must be a 64-char hex string"),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const changePasswordSchema = z.object({
  current_auth_hash: z.string().regex(/^[a-f0-9]{64}$/i, "must be a 64-char hex string"),
  new_auth_hash: z.string().regex(/^[a-f0-9]{64}$/i, "must be a 64-char hex string"),
  new_encrypted_symmetric_key: z.string().optional(),
});

authRouter.post("/register", rateLimit(FIFTEEN_MIN, 5), async (req, res) => {
  const body = registerSchema.parse(req.body);
  const result = await authService.register(
    body.email,
    body.auth_hash,
    body.encrypted_symmetric_key,
    body.argon2_params,
  );
  res.status(201).json(result);
});

authRouter.post("/login", rateLimit(FIFTEEN_MIN, 10), async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body.email, body.auth_hash);
  res.json(result);
});

authRouter.post("/refresh", rateLimit(FIFTEEN_MIN, 30), async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const result = await authService.refresh(body.refresh_token);
  res.json(result);
});

authRouter.get("/me", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const result = await authService.getMe(req.userId);
  res.json(result);
});

authRouter.put("/password", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const body = changePasswordSchema.parse(req.body);
  const result = await authService.changePassword(
    req.userId,
    body.current_auth_hash,
    body.new_auth_hash,
    body.new_encrypted_symmetric_key,
  );
  res.json(result);
});

// --- Web app auth endpoints (httpOnly cookie for refresh token) ---

const REFRESH_COOKIE = "vaultic_refresh";
const cookieOptions = () => ({
  httpOnly: true,
  secure: envConfig.corsOrigin !== false, // secure in production (behind HTTPS)
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: envConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
});

authRouter.post("/web/login", rateLimit(FIFTEEN_MIN, 10), async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body.email, body.auth_hash);
  res.cookie(REFRESH_COOKIE, result.refresh_token, cookieOptions());
  res.json({ access_token: result.access_token, user_id: result.user_id });
});

authRouter.post("/web/refresh", rateLimit(FIFTEEN_MIN, 30), async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) throw AppError.unauthorized("no refresh token");

  const result = await authService.refresh(refreshToken);
  // Keep existing refresh token in cookie (don't rotate — avoids token replay issues)
  // Cookie refreshes its maxAge on each call, extending the session
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  res.json(result);
});

authRouter.post("/web/logout", async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
  res.json({ message: "logged out" });
});
