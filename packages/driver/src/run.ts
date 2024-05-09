import {PobWindow} from "./main.ts";

const win = new PobWindow({
    container: document.querySelector("#window")!,
    dataPrefix: __DATA_PREFIX__,
    assetPrefix: __ASSET_PREFIX__,
});
win.start();
