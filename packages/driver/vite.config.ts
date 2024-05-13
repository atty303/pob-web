import * as path from "node:path";
import { defineConfig } from "vite";

// // https://vitejs.dev/config/
export default defineConfig({
	define: {
		__ASSET_PREFIX__: JSON.stringify(
			"https://pob-web-asset.atty303.ninja/versions",
		),
	},
});
