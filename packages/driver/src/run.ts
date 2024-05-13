import * as zenfs from "@zenfs/core";
import { Zip } from "@zenfs/zip";
import { PobDriver } from "./main.ts";

const version = "2.42.0";
const versionPrefix = `${__ASSET_PREFIX__}/v${version}`;
const rootZip = await fetch(`${versionPrefix}/root.zip`);

await zenfs.configure({
	mounts: {
		"/root": {
			backend: Zip,
			zipData: await rootZip.arrayBuffer(),
			name: "root.zip",
		},
	},
});

const driver = new PobDriver({
	container: document.querySelector("#window")!,
	assetPrefix: versionPrefix,
	onError: (message) => console.error(message),
	onFrame: (_render, _time) => {},
	onFetch: async (url, _headers, _body) => {
		throw new Error(`Fetch not implemented in shell: ${url}`);
	},
});
driver.mount(zenfs.fs);
driver.start();
