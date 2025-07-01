import { Driver } from "./driver";

(async () => {
  let version;
  switch (__RUN_GAME__) {
    case "le":
      version = "3";
      break;
    case "poe2":
      version = "2";
      break;
    default:
      version = "1";
  }
  const versionPrefix = `${__ASSET_PREFIX__}/${version}/${__RUN_VERSION__}/r2`;

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
