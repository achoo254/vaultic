import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { ZodError } from "zod";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const msg = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    res.status(400).json({ error: msg });
    return;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  // Mongoose duplicate key (E11000)
  if (err.name === "MongoServerError" && (err as unknown as Record<string, unknown>).code === 11000) {
    res.status(409).json({ error: "duplicate key" });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal server error" });
}
