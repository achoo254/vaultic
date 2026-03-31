import { build } from "esbuild";

// Bundle ALL dependencies into dist/server.js — prod has no node_modules.
// All backend deps are pure JS (no native .node bindings), safe to bundle.
// Banner: create proper require() for ESM — bundled CJS code needs it for
// Node built-ins (tty, fs, etc.) that esbuild's __require shim can't resolve.
await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/server.js",
  sourcemap: true,
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log("Build complete → dist/server.js");
