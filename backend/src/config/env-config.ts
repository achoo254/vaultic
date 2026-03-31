// Env vars are injected at build-time by esbuild define (see build.js).
// In dev, tsx --env-file loads them. No runtime dotenv needed.

export const envConfig = {
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  authHashKey: requireEnv("AUTH_HASH_KEY"),
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
