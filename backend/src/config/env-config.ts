// In dev: dotenv loads .env file. In prod bundle: esbuild replaces process.env.X with literals.
// IMPORTANT: esbuild define only replaces dot notation (process.env.KEY), NOT bracket notation.
// All env access MUST use dot notation for build-time injection to work.
import "dotenv/config";

export const envConfig = {
  mongodbUri: requireEnv(process.env.MONGODB_URI, "MONGODB_URI"),
  jwtSecret: requireEnv(process.env.JWT_SECRET, "JWT_SECRET"),
  authHashKey: requireEnv(process.env.AUTH_HASH_KEY, "AUTH_HASH_KEY"),
  serverPort: parseInt(process.env.SERVER_PORT ?? "8080", 10),
  accessTokenTtlMin: parseInt(process.env.ACCESS_TOKEN_TTL_MIN ?? "15", 10),
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? "7", 10),
  corsOrigin: process.env.CORS_ORIGIN?.split(",") ?? (false as string[] | false),
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}
