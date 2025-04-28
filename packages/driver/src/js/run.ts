import { Driver } from "./driver";

(async () => {
  const version = `${__RUN_GAME__ === "poe2" ? "2" : "1"}/${__RUN_VERSION__}/r2`;
  const versionPrefix = `${__ASSET_PREFIX__}/${version}`;

  const driver = new Driver(__RUN_BUILD__, versionPrefix, {
    onError: message => console.error(message),
    onFrame: (_render, _time) => {},
    onFetch: async (_url, _headers, _body) => {
      throw new Error("Fetch not implemented in shell");
    },
    onTitleChange: _title => {},
  });
  await driver.start({
    cloudflareKvPrefix: "/api/kv/",
    cloudflareKvAccessToken: undefined,
    cloudflareKvUserNamespace: undefined,
  });
  const window = document.querySelector("#window") as HTMLElement;
  if (window) {
    driver.attachToDOM(window);
  }
})();
