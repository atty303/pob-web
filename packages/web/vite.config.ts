import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

const randomString =
	new Date().getTime() + "." + Math.random().toString(36).substring(2, 8);

const { dataPrefix, assetPrefix } = (() => {
	if (process.env.NODE_ENV === "development") {
		return {
			dataPrefix: JSON.stringify(
				"@fs/" + path.resolve("../driver/dist").replaceAll("\\", "/") + "/",
			),
			assetPrefix: JSON.stringify(
				"@fs/" +
					path
						.resolve("../../vendor/PathOfBuilding/src")
						.replaceAll("\\", "/") +
					"/",
			),
		};
	} else {
		if (process.env.DEPLOYMENT === "cloudflare") {
			return {
				dataPrefix: JSON.stringify(
					`https://pob-web-asset.atty303.ninja/asset/.r2-${randomString}/data/`,
				),
				assetPrefix: JSON.stringify(
					`https://pob-web-asset.atty303.ninja/asset/.r2-${randomString}/asset/`,
				),
			};
		} else {
			return {
				dataPrefix: JSON.stringify(`/.r2-${randomString}/data/`),
				assetPrefix: JSON.stringify(`/.r2-${randomString}/asset/`),
			};
		}
	}
})();

function stripPrefix(prefix: string, fullPath: string) {
	return fullPath.replace(path.resolve(prefix) + path.sep, "");
}

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		proxy: {
			"/api": "http://localhost:8788",
		},
	},
	build: {
		chunkSizeWarningLimit: 2000,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					const noHash = [
						// These files are loaded by the driver, and their names are hardcoded
						"driver.wasm",
					];
					if (noHash.some((_) => assetInfo.name!.includes(_))) {
						return `assets/[name][extname]`;
					}
					return `assets/[name]-[hash][extname]`;
				},
			},
		},
	},
	define: {
		APP_VERSION: JSON.stringify(process.env.npm_package_version),
		__DATA_PREFIX__: dataPrefix,
		__ASSET_PREFIX__: assetPrefix,
	},
	plugins: [
		react(),
		viteStaticCopy({
			targets: [
				{
					src: "../driver/dist/*.data",
					dest: `.r2-${randomString}/data/`,
				},
				{
					src: [
						"../../vendor/PathOfBuilding/src/Assets/**",
						"../../vendor/PathOfBuilding/src/TreeData/**/*.(png|jpg)",
					],
					dest: `.r2-${randomString}/asset/`,
					rename: (fileName, fileExtension, fullPath) => {
						return stripPrefix("../../vendor/PathOfBuilding/src", fullPath);
					},
				},
			],
		}),
	],
});
