import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { envConfig } from "./config/env-config.js";
import { requestLogger, logger } from "./middleware/request-logger-middleware.js";
import { errorHandler } from "./middleware/error-handler-middleware.js";
import { healthRouter } from "./routes/health-route.js";
import { authRouter } from "./routes/auth-route.js";
import { syncRouter } from "./routes/sync-route.js";
import { shareRouter, sharePageRouter } from "./routes/share-route.js";
import { extensionUpdateRouter } from "./routes/extension-update-route.js";

const app = express();

// Trust first proxy hop — required for correct IP/protocol behind nginx/load balancer
app.set('trust proxy', 1);

// 1. Request logger (first — logs all requests)
app.use(requestLogger);

// 2. CORS
const corsOptions = {
  origin: envConfig.corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));

// 3. Body parser + cookie parser
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// 4. Routes
app.use("/api/v1", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/sync", syncRouter);
app.use("/api/v1/shares", shareRouter);
app.use("/s", sharePageRouter);
app.use("/api/v1/extension", extensionUpdateRouter);

// Static files — extension release downloads (dev; nginx serves in prod)
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use("/static/releases", express.static(join(__dirname, "../static/releases")));

// 5. 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

// 6. Error handler (last)
app.use(errorHandler);

// Start
async function start() {
  await mongoose.connect(envConfig.mongodbUri);
  logger.info("Connected to MongoDB");

  const server = app.listen(envConfig.serverPort, () => {
    logger.info(`Server listening on port ${envConfig.serverPort}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
