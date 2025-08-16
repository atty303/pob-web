import * as path from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, normalizePath, searchForWorkspaceRoot } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const rootDir = path.resolve(__dirname, "../..");
const packerR2Dir = path.resolve(__dirname, "../packer/r2");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
    sourcemap: true,
    ssr: false,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    __VERSION_URL__: JSON.stringify(
      mode === "development" && process.env.POB_COOL_ASSET === undefined
        ? `/@fs/${rootDir}/version.json`
        : "https://asset.pob.cool/version.json",
    ),
    __ASSET_PREFIX__: JSON.stringify(
      mode === "development" && process.env.POB_COOL_ASSET === undefined
        ? `/@fs/${packerR2Dir}`
        : "https://asset.pob.cool",
    ),
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
    reactRouter(),
    tailwindcss(),
    viteStaticCopy({
      targets: [{ src: normalizePath(path.join(rootDir, "packages/driver/dist/*")), dest: "dist/" }],
    }),
  ],
}));
