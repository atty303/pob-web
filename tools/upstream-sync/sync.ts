import $ from "@david/dax";
import { dirname } from "@std/path";
import { type Game, gameData } from "../../packages/game/src/index.ts";
import { createGraphqlClient, getLatestTags, type GraphqlClient } from "./github.ts";
import {
  findNewTags,
  type MatrixResult,
  mergeMatrixResults,
  parseMatrixResult,
  parseVersions,
  type Versions,
} from "./model.ts";

export type MiseRunner = (args: readonly string[], allowFailure?: boolean) => Promise<number>;

export const daxMiseRunner: MiseRunner = async (args, allowFailure = false) => {
  const result = await $`mise ${["run", ...args]}`.noThrow(allowFailure);
  return result.code;
};

export async function collectGameResult(options: {
  game: Game;
  versions: Versions;
  dryRun: boolean;
  runner: MiseRunner;
  graphql: GraphqlClient;
}): Promise<MatrixResult> {
  const latestTags = await getLatestTags(options.graphql, gameData[options.game].repository);
  const newTags = findNewTags(latestTags, options.versions[options.game].versions);
  if (newTags.length === 0) return { game: options.game, releases: [] };

  await options.runner(["visual:setup"]);
  await options.runner(["driver:build"]);

  const releases = [];
  for (const tag of newTags) {
    await options.runner(["pack", "--game", options.game, "--tag", tag.name]);
    if (!options.dryRun) await options.runner(["sync", "--game", options.game, "--tag", tag.name]);

    const e2eArgs = ["test:e2e:driver", "--game", options.game, "--version", tag.name];
    if (!options.dryRun) e2eArgs.push("--pob-cool-asset");
    const exitCode = await options.runner(e2eArgs, true);
    releases.push(
      {
        value: tag.name,
        date: tag.committedDate,
        testResult: exitCode === 0 ? "tested" : "failed",
      } as const,
    );
  }

  return { game: options.game, releases };
}

export async function collectFromFiles(options: {
  game: Game;
  versionFile: string;
  outputFile: string;
  dryRun: boolean;
  githubToken: string;
  runner?: MiseRunner;
}): Promise<MatrixResult> {
  const versions = parseVersions(JSON.parse(await Deno.readTextFile(options.versionFile)));
  const result = await collectGameResult({
    game: options.game,
    versions,
    dryRun: options.dryRun,
    runner: options.runner ?? daxMiseRunner,
    graphql: createGraphqlClient(options.githubToken),
  });
  await Deno.mkdir(dirname(options.outputFile), { recursive: true });
  await Deno.writeTextFile(options.outputFile, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export async function mergeResultFiles(options: {
  versionFile: string;
  resultFiles: readonly string[];
  dryRun: boolean;
  runner?: MiseRunner;
}): Promise<Versions> {
  const versions = parseVersions(JSON.parse(await Deno.readTextFile(options.versionFile)));
  const results = await Promise.all(
    options.resultFiles.map(async (file) => parseMatrixResult(JSON.parse(await Deno.readTextFile(file)))),
  );
  const merged = mergeMatrixResults(versions, results);
  const before = JSON.stringify(versions);
  const after = JSON.stringify(merged);
  if (before === after) return merged;

  await Deno.writeTextFile(options.versionFile, JSON.stringify(merged, null, 2));
  if (!options.dryRun) {
    await (options.runner ?? daxMiseRunner)(["sync:metadata", "--file", options.versionFile]);
  }
  return merged;
}
