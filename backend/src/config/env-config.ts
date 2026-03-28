// Load .env file (skips vars already set by --env-file or system env)
import dotenv from "dotenv";
dotenv.config();

export const envConfig = {
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  serverPort: parseInt(process.env["SERVER_PORT"] ?? "8080", 10),
  accessTokenTtlMin: parseInt(process.env["ACCESS_TOKEN_TTL_MIN"] ?? "15", 10),
  refreshTokenTtlDays: parseInt(process.env["REFRESH_TOKEN_TTL_DAYS"] ?? "7", 10),
} as const;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} must be set`);
  }
  return value;
}
