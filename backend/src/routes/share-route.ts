import { Router, type Router as RouterType } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import * as shareService from "../services/share-service.js";
import { authRequired, authOptional } from "../middleware/auth-middleware.js";
import { AppError } from "../utils/app-error.js";

export const shareRouter: RouterType = Router();
export const sharePageRouter: RouterType = Router();

// Legacy: create share with encrypted data on server
const createShareSchema = z.object({
  encryptedData: z.string().min(1),
  maxViews: z.number().int().positive().optional(),
  ttlHours: z.number().int().positive().optional(),
  vaultItemId: z.string().uuid().optional(),
});

// Hybrid: create metadata-only share (encrypted data in URL fragment)
const createMetadataShareSchema = z.object({
  share_id: z.string().min(8).max(24),
  max_views: z.number().int().positive().optional(),
  ttl_hours: z.number().int().positive().optional(),
});

// POST /api/v1/shares — legacy (encrypted data on server)
shareRouter.post("/", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const body = createShareSchema.parse(req.body);
  const result = await shareService.create(
    req.userId,
    body.encryptedData,
    body.maxViews,
    body.ttlHours,
    body.vaultItemId,
  );
  res.status(201).json(result);
});

// POST /api/v1/shares/metadata — hybrid (metadata only, auth optional for offline users)
shareRouter.post("/metadata", authOptional, async (req, res) => {
  const body = createMetadataShareSchema.parse(req.body);
  const result = await shareService.createMetadata(
    req.userId || null,
    body.share_id,
    body.max_views,
    body.ttl_hours,
  );
  res.status(201).json(result);
});

// GET /api/v1/shares/:id/check — check access + atomic view increment (for hybrid shares)
shareRouter.get("/:id/check", async (req, res) => {
  const result = await shareService.checkShareAccess(req.params.id as string);
  res.json(result);
});

// GET /api/v1/shares/:id — retrieve encrypted data (legacy shares)
shareRouter.get("/:id", async (req, res) => {
  const result = await shareService.retrieve(req.params.id as string);
  res.json(result);
});

// GET /api/v1/shares/:id/meta — metadata without view increment
shareRouter.get("/:id/meta", async (req, res) => {
  const result = await shareService.getMeta(req.params.id as string);
  res.json(result);
});

// DELETE /api/v1/shares/:id
shareRouter.delete("/:id", authRequired, async (req, res) => {
  if (!req.userId) throw AppError.unauthorized("missing user");
  const result = await shareService.deleteShare(req.params.id as string, req.userId);
  res.json(result);
});

// GET /s/:id — static share page
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharePage = path.join(__dirname, "../static/share-page.html");

sharePageRouter.get("/:id", (_req, res) => {
  res.sendFile(sharePage);
});
