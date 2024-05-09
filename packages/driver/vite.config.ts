import {defineConfig} from 'vite';
import * as path from "node:path";

// // https://vitejs.dev/config/
export default defineConfig({
    define: {
        __DATA_PREFIX__: JSON.stringify("@fs/" + path.resolve("dist").replaceAll("\\", "/") + "/"),
        __ASSET_PREFIX__: JSON.stringify("@fs/" + path.resolve("../../vendor/PathOfBuilding/src").replaceAll("\\", "/") + "/"),
    },
    server: {
        fs: {
            allow: [
                ".",
                "../../vendor/PathOfBuilding/src",
            ],
        },
    },
});