import { type Game, gameData } from "pob-game";
import { Driver } from "./driver.ts";

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
      pressedKeys: [],
      frameSamples: [],
      resetFrameSamples() {
        this.frameSamples = [];
      },
    }
    : undefined;

  if (testState) window.__POB_TEST__ = testState;

  const versionPrefix = `${__ASSET_PREFIX__}/games/${game}/versions/${version}`;
  console.log("Loading driver with assets:", versionPrefix);

  const driver = new Driver(
    __RUN_BUILD__,
    versionPrefix,
    {
      onError: (error) => {
        testState?.errors.push(String(error));
        console.error(error);
      },
      onFrame: (_at, time, stats) => {
        if (testState) {
          testState.frameCount += 1;
          testState.frameSamples.push({ totalTime: time, rendererTime: stats?.lastFrameTime ?? 0 });
          if (stats) testState.renderStats = stats;
        }
      },
      onFetch: async (_url, _headers, _body) => {
        throw new Error("Fetch not implemented in shell");
      },
      onTitleChange: (title) => {
        if (testState) testState.title = title;
      },
    },
    {
      onKeyboardStateChange: (keys) => {
        if (testState) testState.pressedKeys = [...keys];
      },
    },
  );
  await driver.start({
    userDirectory: gameData[game as Game].userDirectory,
    cloudflareKvPrefix: "/api/kv/",
    cloudflareKvAccessToken: undefined,
    cloudflareKvUserNamespace: undefined,
  });
  const root = document.querySelector("#window") as HTMLElement;
  if (root) {
    await driver.attachToDOM(root);
  }
  if (testState) {
    testState.started = true;
    testState.loadBuildFromCode = (code) => driver.loadBuildFromCode(code);
    testState.getBuildCode = () => driver.getBuildCode();
  }
})();
