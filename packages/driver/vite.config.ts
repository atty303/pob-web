import * as path from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import Inspect from "vite-plugin-inspect";

const packerR2Dir = path.resolve(__dirname, "../packer/r2");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  logLevel: "info",
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), packerR2Dir],
    },
  },
  define: {
    __ASSET_PREFIX__: JSON.stringify(
      mode === "development" && process.env.POB_COOL_ASSET === undefined ? `/@fs/${packerR2Dir}` : "https://asset.pob.cool",
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
  plugins: [Inspect()],
}));
