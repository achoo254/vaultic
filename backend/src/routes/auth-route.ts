import { Router, type Router as RouterType } from "express";
import { z } from "zod";
import * as authService from "../services/auth-service.js";
import { authRequired } from "../middleware/auth-middleware.js";
import { rateLimit } from "../middleware/rate-limit-middleware.js";
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
