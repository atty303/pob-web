import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8788",
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    __ASSET_PREFIX__: JSON.stringify("https://pob-web-asset.atty303.ninja/versions"),
  },
  worker: {
    format: "es",
  },
  plugins: [
    react(),
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        plugins: [["@simbathesailor/babel-plugin-use-what-changed", { active: true }]],
      },
    }),
  ],
});
