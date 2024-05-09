import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import * as path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2000,
  },
  define: {
    __DATA_PREFIX__: JSON.stringify("@fs/" + path.resolve("../driver/dist").replaceAll("\\", "/") + "/"),
    __ASSET_PREFIX__: JSON.stringify("@fs/" + path.resolve("../../vendor/PathOfBuilding/src").replaceAll("\\", "/") + "/"),
  },
  plugins: [react()],
})
