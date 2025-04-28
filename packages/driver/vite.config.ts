import * as path from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import Inspect from "vite-plugin-inspect";

const packerBuildDir = path.resolve(__dirname, "../packer/build");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  logLevel: "info",
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), packerBuildDir],
    },
  },
  define: {
    __ASSET_PREFIX__: JSON.stringify(
      mode === "development" ? `/@fs/${packerBuildDir}` : "https://asset.pob.cool/versions",
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
