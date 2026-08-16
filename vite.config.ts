import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Rewrites dist/sw.js after the bundle is written: PRECACHE_ASSETS gets the
 * emitted hashed assets/... files (they must be precached at install — the
 * worker registers after window load, so first-view fetches happen before it
 * controls the page) and VERSION gets a digest of those names so each deploy
 * evicts the previous caches on activate.
 */
function swPrecachePlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "app:sw-precache-manifest",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      const outDir = join(config.root, config.build.outDir);
      const assets = readdirSync(join(outDir, "assets")).map((f) => `assets/${f}`);
      const version = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 12);
      const swPath = join(outDir, "sw.js");
      const source = readFileSync(swPath, "utf8");
      const patched = source
        .replace('const VERSION = "dev";', `const VERSION = ${JSON.stringify(version)};`)
        .replace("const PRECACHE_ASSETS = [];", `const PRECACHE_ASSETS = ${JSON.stringify(assets)};`);
      if (patched === source) {
        throw new Error("sw.js placeholders not found — precache manifest not injected");
      }
      writeFileSync(swPath, patched);
    },
  };
}

// BASE_PATH lets CI build for a subdirectory (GitHub Pages serves the app at
// /<repo>/). Local dev and preview stay at the root.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact(), swPrecachePlugin()],
});
