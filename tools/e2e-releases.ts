import { type Game, games, isGame } from "../packages/game/src/index.ts";
import versions from "../version.json";

export type E2ERelease = { game: Game; version: string };

export const headRelease = (game: Game): E2ERelease => ({ game, version: versions[game].head });

export const headReleases = games.map(headRelease);

export function resolveDriverReleases(environment: Readonly<Record<string, string | undefined>> = process.env): {
  releases: E2ERelease[];
  targeted: boolean;
} {
  const configuredGame = environment.RUN_GAME;
  const configuredVersion = environment.RUN_VERSION;

  if (configuredVersion !== undefined && configuredGame === undefined) {
    throw new Error("RUN_VERSION requires RUN_GAME");
  }
  if (configuredGame !== undefined && !isGame(configuredGame)) {
    throw new Error(`Unsupported game: ${configuredGame}`);
  }

  return configuredGame === undefined
    ? { releases: headReleases, targeted: false }
    : {
        releases: [{ game: configuredGame, version: configuredVersion || versions[configuredGame].head }],
        targeted: true,
      };
}
