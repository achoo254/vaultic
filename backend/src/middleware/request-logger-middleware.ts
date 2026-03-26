import pinoHttp from "pino-http";
import pino from "pino";

export const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info" });

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/api/v1/health",
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
