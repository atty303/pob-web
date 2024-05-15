import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8788",
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
    sourcemap: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    __ASSET_PREFIX__: JSON.stringify("https://asset.pob.cool/versions"),
  },
  worker: {
    format: "es",
  },
  plugins: [react()],
});
