import { Router, type Router as RouterType } from "express";
import { z } from "zod";
import * as syncService from "../services/sync-service.js";
import { User } from "../models/user-model.js";
import { authRequired } from "../middleware/auth-middleware.js";
import { AppError } from "../utils/app-error.js";

export const syncRouter: RouterType = Router();

const syncItemSchema = z.object({
  id: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  itemType: z.string().optional(),
  encryptedData: z.string().min(1),
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const syncFolderSchema = z.object({
  id: z.string().uuid(),
  encryptedName: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const pushSchema = z.object({
  deviceId: z.string().min(1),
  items: z.array(syncItemSchema).max(500).default([]),
  folders: z.array(syncFolderSchema).max(200).default([]),
});

const pullQuerySchema = z.object({
  deviceId: z.string().min(1),
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().optional(),
});

// POST /api/v1/sync/push
syncRouter.post("/push", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const body = pushSchema.parse(req.body);
  const result = await syncService.push(req.userId, body.deviceId, body.items, body.folders);
  res.json(result);
});

// GET /api/v1/sync/pull
syncRouter.get("/pull", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const query = pullQuerySchema.parse(req.query);
  const result = await syncService.pull(req.userId, query.deviceId, query.since, query.limit, query.cursor);
  res.json(result);
});

// DELETE /api/v1/sync/data
syncRouter.delete("/data", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const result = await syncService.purge(req.userId);
  res.json(result);
});

// --- Preferences sync (language + theme) ---

const preferencesSchema = z.object({
  language: z.enum(["en", "vi"]),
  theme: z.enum(["light", "dark", "system"]),
  updatedAt: z.number().int().positive(),
});

// PUT /api/v1/sync/preferences — push local preferences to server
syncRouter.put("/preferences", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const body = preferencesSchema.parse(req.body);
  await User.updateOne({ _id: req.userId }, { $set: { preferences: body } });
  res.json({ ok: true });
});

// GET /api/v1/sync/preferences — pull preferences from server
syncRouter.get("/preferences", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const user = await User.findById(req.userId).select("preferences").lean();
  res.json({ preferences: user?.preferences ?? null });
});
