import { build } from "esbuild";
import { config } from "dotenv";
import { existsSync } from "fs";

// Load env from .env and .env.{mode} for build-time injection
// Prod server receives a self-contained bundle — no .env file needed at runtime
const mode = process.argv[2] || "production";
const envFiles = [".env", `.env.${mode}`];
for (const f of envFiles) {
  if (existsSync(f)) config({ path: f, override: true });
}

// All env vars used by the backend — inject as build-time constants
const envKeys = [
  "MONGODB_URI",
  "JWT_SECRET",
  "AUTH_HASH_KEY",
  "SERVER_PORT",
  "ACCESS_TOKEN_TTL_MIN",
  "REFRESH_TOKEN_TTL_DAYS",
  "CORS_ORIGIN",
  "LOG_LEVEL",
];

const define = {};
for (const key of envKeys) {
  const val = process.env[key];
  if (val !== undefined) {
    define[`process.env.${key}`] = JSON.stringify(val);
  }
}

// Bundle ALL deps — prod has no node_modules.
// Banner: create proper require() for ESM — bundled CJS code needs it for
// Node built-ins (tty, fs, etc.) that esbuild's __require shim can't resolve.
await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: `dist/server-${mode}.js`,
  sourcemap: true,
  minify: true,
  keepNames: true,
  define,
  loader: { ".html": "text" },
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

const injected = Object.keys(define).length;
console.log(`Build complete → dist/server-${mode}.js (${injected} env vars injected)`);
