import type { Game } from "../packages/game/src/index.ts";

const versions = JSON.parse(Deno.readTextFileSync(new URL("../version.json", import.meta.url))) as Record<
  Game,
  { head: string }
>;
const games = Object.keys(versions) as Game[];
const isGame = (game: string): game is Game => Object.hasOwn(versions, game);

export type E2ERelease = { game: Game; version: string };

export const headRelease = (game: Game): E2ERelease => ({ game, version: versions[game].head });

export const headReleases = games.map(headRelease);

export function resolveDriverReleases(
  environment: Readonly<Record<string, string | undefined>> = Deno.env.toObject(),
): {
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
