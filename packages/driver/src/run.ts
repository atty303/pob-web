import { PobDriver } from "./main.ts";

const driver = new PobDriver({
	container: document.querySelector("#window")!,
	dataPrefix: __DATA_PREFIX__,
	assetPrefix: __ASSET_PREFIX__,
	onError: (message) => console.error(message),
	onFrame: (_render, _time) => {},
	onFetch: async (url, _headers, _body) => {
		throw new Error(`Fetch not implemented in shell: ${url}`);
	},
});
driver.start();
