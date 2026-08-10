import * as path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";

const packerR2Dir = path.resolve(__dirname, "../packer/r2");
const rootDir = path.resolve(__dirname, "../..");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDriverShell = mode === "development" || mode === "test";
  const usePobCoolAsset = mode === "development" && process.env.POB_COOL_ASSET === "true";

  return {
    resolve: {
      alias: {
        "dds/src": path.join(rootDir, "packages/dds/src/index.ts"),
        "pob-game/src": path.join(rootDir, "packages/game/src/index.ts"),
      },
    },
    logLevel: "info",
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
      fs: {
        allow: [rootDir, packerR2Dir],
      },
      // Owner's Cloudflare Tunnel domain for mobile testing
      allowedHosts: ["local.pob.cool"],
      proxy:
        isDriverShell && usePobCoolAsset
          ? {
              "/__pob_asset": {
                target: "https://asset.pob.cool",
                changeOrigin: true,
                rewrite: path => path.replace(/^\/__pob_asset/, ""),
              },
            }
          : undefined,
    },
    define: {
      __ASSET_PREFIX__: JSON.stringify(
        isDriverShell ? (usePobCoolAsset ? "/__pob_asset" : `/@fs/${packerR2Dir}`) : "https://asset.pob.cool",
      ),
      __RUN_GAME__: JSON.stringify(process.env.RUN_GAME ?? "poe2"),
      __RUN_VERSION__: JSON.stringify(process.env.RUN_VERSION ?? "v0.8.0"),
      __RUN_BUILD__: JSON.stringify(process.env.RUN_BUILD ?? "release"),
    },
    build: {
      sourcemap: true,
    },
    worker: {
      format: "es",
    },
    optimizeDeps: {
      exclude: ["@bokuweb/zstd-wasm"],
      esbuildOptions: {
        target: "es2020",
      },
    },
    plugins: [react(), tailwindcss(), Inspect()],
  };
});
