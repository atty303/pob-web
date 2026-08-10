import * as fs from "node:fs";
import * as path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, normalizePath, searchForWorkspaceRoot } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { wranglerDev } from "./wrangler-dev.ts";

const rootDir = path.resolve(__dirname, "../..");
const packerR2Dir = path.resolve(__dirname, "../packer/r2");
const appVersion = fs.readFileSync(path.join(rootDir, "version.txt"), "utf8").trim();

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "dds/src": path.join(rootDir, "packages/dds/src/index.ts"),
      "pob-driver/src/js": path.join(rootDir, "packages/driver/src/js"),
      "pob-game/src": path.join(rootDir, "packages/game/src/index.ts"),
      "react-dom/server": "react-dom/server.node",
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:8788",
    },
    sourcemapIgnoreList(file) {
      return file.includes("node_modules") || file.includes("logger.ts");
    },
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), rootDir],
    },
    // Owner's Cloudflare Tunnel domain for mobile testing
    allowedHosts: ["local.pob.cool"],
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
    sourcemap: true,
    ssr: false,
  },
  define: {
    APP_VERSION: JSON.stringify(appVersion),
    __SENTRY_RELEASE__:
      process.env.VITE_SENTRY_RELEASE === undefined ? "undefined" : JSON.stringify(process.env.VITE_SENTRY_RELEASE),
    __VERSION_URL__: JSON.stringify(
      mode === "test" || (mode === "development" && process.env.POB_COOL_ASSET === undefined)
        ? `/@fs/${rootDir}/version.json`
        : "https://asset.pob.cool/version.json",
    ),
    __ASSET_PREFIX__: JSON.stringify(
      mode === "test"
        ? `/@fs/${packerR2Dir}`
        : mode === "development" && process.env.POB_COOL_ASSET === undefined
          ? `/@fs/${packerR2Dir}`
          : "https://asset.pob.cool",
    ),
  },
  worker: {
    format: "es",
  },
  ssr: {
    optimizeDeps: {
      exclude: ["react"],
      include: ["react-dom/server.node"],
    },
  },
  optimizeDeps: {
    exclude: ["@bokuweb/zstd-wasm"],
    include: ["@sentry/react", "react", "react-dom", "react-use"],
    esbuildOptions: {
      target: "es2020",
    },
  },
  plugins: [
    ...(mode === "development" ? [wranglerDev()] : []),
    reactRouter(),
    tailwindcss(),
    ...(!isSsrBuild
      ? [
          viteStaticCopy({
            targets: [
              {
                src: normalizePath(path.join(rootDir, "packages/driver/dist/debug/*")),
                dest: "dist/debug/",
              },
              {
                src: normalizePath(path.join(rootDir, "packages/driver/dist/release/!(*.debug.wasm)")),
                dest: "dist/release/",
              },
            ],
          }),
        ]
      : []),
  ],
}));
