import { Router, type Router as RouterType } from "express";
import mongoose from "mongoose";

export const healthRouter: RouterType = Router();

healthRouter.get("/health", (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const status = mongoOk ? 200 : 503;
  res.status(status).json({
    status: mongoOk ? "ok" : "degraded",
    mongo: mongoOk ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});
