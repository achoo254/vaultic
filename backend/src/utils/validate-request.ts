import type { ZodSchema } from "zod";
import { AppError } from "./app-error.js";

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw AppError.badRequest(msg);
  }
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw AppError.badRequest(msg);
  }
  return result.data;
}
