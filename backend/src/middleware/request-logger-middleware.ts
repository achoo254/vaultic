import pinoHttp from "pino-http";
import pino from "pino";
import { envConfig } from "../config/env-config.js";

export const logger = pino({ level: envConfig.logLevel });

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
