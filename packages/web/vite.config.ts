import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:8788",
    },
    sourcemapIgnoreList(file) {
      return file.includes("node_modules") || file.includes("logger.ts");
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
    sourcemap: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    __VERSION_URL__: JSON.stringify("https://asset.pob.cool/version.json"),
    __ASSET_PREFIX__: JSON.stringify("https://asset.pob.cool/versions"),
  },
  worker: {
    format: "es",
  },
  plugins: [react()],
});
