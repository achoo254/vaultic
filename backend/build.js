import { build } from "esbuild";

// Bundle ALL dependencies into dist/server.js — prod has no node_modules.
// All backend deps are pure JS (no native .node bindings), safe to bundle.
await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/server.js",
  sourcemap: true,
});

console.log("Build complete → dist/server.js");
