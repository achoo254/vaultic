// Extension update API — public endpoint for sideload update checker
// Returns latest extension version metadata from static JSON file

import { Router, type Router as RouterType } from "express";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const extensionUpdateRouter: RouterType = Router();

// GET /api/v1/extension/latest — no auth required
extensionUpdateRouter.get("/latest", async (_req, res) => {
  try {
    const filePath = join(__dirname, "../../static/extension-release.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    res.json(data);
  } catch {
    res.status(404).json({ error: "Release metadata not found" });
  }
});
