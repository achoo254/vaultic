import { build } from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// Mark all dependencies as external — they stay in node_modules
// This avoids issues with native modules (mongoose/bson) and runtime patches (express-async-errors)
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];

await build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/server.js",
  sourcemap: true,
  external,
});

console.log("Build complete → dist/server.js");
