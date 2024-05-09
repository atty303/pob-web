import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import * as path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __DATA_PREFIX__: JSON.stringify("@fs/" + path.resolve("../driver/emscripten").replaceAll("\\", "/") + "/"),
    __ASSET_PREFIX__: JSON.stringify("@fs/" + path.resolve("../../vendor/PathOfBuilding/src").replaceAll("\\", "/") + "/"),
  },
  plugins: [react()],
})
