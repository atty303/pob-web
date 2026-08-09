import { isGame } from "../../../game/src/index.ts";

const defaultReleases = [
  { game: "poe1", version: "v2.66.2" },
  { game: "poe2", version: "v0.23.1" },
  { game: "le", version: "v0.12.0" },
] as const;

const configuredGame = process.env.RUN_GAME;
const configuredVersion = process.env.RUN_VERSION;
if ((configuredGame === undefined) !== (configuredVersion === undefined)) {
  throw new Error("RUN_GAME and RUN_VERSION must be set together");
}
if (configuredGame !== undefined && !isGame(configuredGame)) {
  throw new Error(`Unsupported game: ${configuredGame}`);
}

export const targetRelease =
  configuredGame === undefined ? undefined : { game: configuredGame, version: configuredVersion! };
export const releases = targetRelease ? [targetRelease] : defaultReleases;
