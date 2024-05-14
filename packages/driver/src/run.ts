import { PobDriver } from "./main.ts";

const version = "2.42.0";
const versionPrefix = `${__ASSET_PREFIX__}/v${version}`;

const driver = new PobDriver(versionPrefix, {
  onError: (message) => console.error(message),
  onFrame: (_render, _time) => {},
  onFetch: async (url, _headers, _body) => {
    throw new Error(`Fetch not implemented in shell: ${url}`);
  },
});
await driver.start({});
const window = document.querySelector("#window") as HTMLElement;
if (window) {
  driver.attachToDOM(window);
}
