import { Driver } from "./driver";
import {type Game, gameData} from "pob-game/src";

(async () => {
  const versionPrefix = `${__ASSET_PREFIX__}/games/${__RUN_GAME__}/versions/${__RUN_VERSION__}`;
  console.log("Loading driver with assets:", versionPrefix);


  const driver = new Driver(__RUN_BUILD__, versionPrefix, {
    onError: message => console.error(message),
    onFrame: (_render, _time) => {},
    onFetch: async (_url, _headers, _body) => {
      throw new Error("Fetch not implemented in shell");
    },
    onTitleChange: _title => {},
  });
  await driver.start({
    userDirectory: gameData[__RUN_GAME__ as Game].userDirectory,
    cloudflareKvPrefix: "/api/kv/",
    cloudflareKvAccessToken: undefined,
    cloudflareKvUserNamespace: undefined,
  });
  const window = document.querySelector("#window") as HTMLElement;
  if (window) {
    driver.attachToDOM(window);
  }
})();
