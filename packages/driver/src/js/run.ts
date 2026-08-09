import { type Game, gameData } from "pob-game/src";
import { Driver } from "./driver";

(async () => {
  const testMode = import.meta.env.MODE === "test";
  const params = new URLSearchParams(window.location.search);
  const game = (testMode ? params.get("game") : null) ?? __RUN_GAME__;
  const version = (testMode ? params.get("version") : null) ?? __RUN_VERSION__;
  const testState: PoBTestState | undefined = testMode
    ? {
        started: false,
        frameCount: 0,
        renderStats: null,
        title: "",
        errors: [] as string[],
      }
    : undefined;

  if (testState) window.__POB_TEST__ = testState;

  const versionPrefix = `${__ASSET_PREFIX__}/games/${game}/versions/${version}`;
  console.log("Loading driver with assets:", versionPrefix);

  const driver = new Driver(__RUN_BUILD__, versionPrefix, {
    onError: error => {
      testState?.errors.push(String(error));
      console.error(error);
    },
    onFrame: (_at, _time, stats) => {
      if (testState) {
        testState.frameCount += 1;
        if (stats) testState.renderStats = stats;
      }
    },
    onFetch: async (_url, _headers, _body) => {
      throw new Error("Fetch not implemented in shell");
    },
    onTitleChange: title => {
      if (testState) testState.title = title;
    },
  });
  await driver.start({
    userDirectory: gameData[game as Game].userDirectory,
    cloudflareKvPrefix: "/api/kv/",
    cloudflareKvAccessToken: undefined,
    cloudflareKvUserNamespace: undefined,
  });
  const root = document.querySelector("#window") as HTMLElement;
  if (root) {
    driver.attachToDOM(root);
  }
  if (testState) {
    testState.started = true;
    testState.loadBuildFromCode = code => driver.loadBuildFromCode(code);
    testState.getBuildCode = () => driver.getBuildCode();
  }
})();
