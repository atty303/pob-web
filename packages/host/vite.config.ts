import {defineConfig} from 'vite';
import * as path from "node:path";

// // https://vitejs.dev/config/
export default defineConfig({
    define: {
        __DATA_PREFIX__: JSON.stringify("@fs/" + path.resolve("../driver/emscripten").replaceAll("\\", "/") + "/"),
    },
    server: {
        fs: {
            allow: [
                ".",
                "../driver/emscripten",
            ],
        },
    },
});