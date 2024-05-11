import {PobWindow} from "./main.ts";

const win = new PobWindow({
    container: document.querySelector("#window")!,
    dataPrefix: __DATA_PREFIX__,
    assetPrefix: __ASSET_PREFIX__,
    onError: (message) => console.error(message),
    onFrame: (_render, _time) => {},
    onFetch: async (url, _header, _body) => {
        throw new Error(`Fetch not implemented in shell: ${url}`);
    },
});
win.start();
