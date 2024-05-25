import { Driver } from "./driver.ts";

const version = "2.42.0";
const versionPrefix = `${__ASSET_PREFIX__}/v${version}`;

const driver = new Driver("release", versionPrefix, {
  onError: (message) => console.error(message),
  onFrame: (_render, _time) => {},
  onFetch: async (_url, _headers, _body) => {
    throw new Error("Fetch not implemented in shell");
  },
  onTitleChange: (_title) => {},
});
await driver.start({ cloudflareKvPrefix: "/api/kv/", cloudflareKvAccessToken: undefined });
const window = document.querySelector("#window") as HTMLElement;
if (window) {
  driver.attachToDOM(window);
}
