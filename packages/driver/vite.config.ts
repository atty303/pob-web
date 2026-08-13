import * as path from "@std/path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import { viteStaticCopy } from "vite-plugin-static-copy";

const packageDir = path.dirname(path.fromFileUrl(import.meta.url));
const packerR2Dir = path.resolve(packageDir, "../packer/r2");
const rootDir = path.resolve(packageDir, "../..");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDriverShell = mode === "development" || mode === "test";
  const usePobCoolAsset = mode === "development" && Deno.env.get("POB_COOL_ASSET") === "true";

  return {
    resolve: {
      alias: {
        dds: path.join(rootDir, "packages/dds/src/index.ts"),
        "pob-game": path.join(rootDir, "packages/game/src/index.ts"),
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
      proxy: isDriverShell && usePobCoolAsset
        ? {
          "/__pob_asset": {
            target: "https://asset.pob.cool",
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/__pob_asset/, ""),
          },
        }
        : undefined,
    },
    define: {
      __BPTC_SUPPORT_OVERRIDE__: Deno.env.get("BPTC_SUPPORT_OVERRIDE") === "false" ? "false" : "undefined",
      __MAX_RENDERING_DIMENSION_OVERRIDE__: "undefined",
      __ASSET_PREFIX__: JSON.stringify(
        isDriverShell ? (usePobCoolAsset ? "/__pob_asset" : `/@fs/${packerR2Dir}`) : "https://asset.pob.cool",
      ),
      __RUN_GAME__: JSON.stringify(Deno.env.get("RUN_GAME") ?? "poe2"),
      __RUN_VERSION__: JSON.stringify(Deno.env.get("RUN_VERSION") ?? "v0.8.0"),
      __RUN_BUILD__: JSON.stringify(Deno.env.get("RUN_BUILD") ?? "release"),
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
    plugins: [
      react(),
      tailwindcss(),
      viteStaticCopy({
        targets: [{
          src: path.join(rootDir, "node_modules/texture2ddecoder-wasm/wasm/*"),
          dest: "texture2ddecoder",
        }],
      }),
      Inspect(),
    ],
  };
});
