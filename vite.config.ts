import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  plugins: [tailwindcss(), viteReact()],
});
