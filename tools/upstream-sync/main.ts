import { Command, EnumType } from "@cliffy/command";
import { join } from "@std/path";
import { type Game, games } from "../../packages/game/src/index.ts";
import { collectFromFiles, mergeResultFiles } from "./sync.ts";

const gameType = new EnumType(games);

const collect = new Command()
  .description("Discover, sync, and test new releases for one game")
  .type("game", gameType)
  .option("--game <game:game>", "Game handled by this matrix job", { required: true })
  .option("--version-file <path:string>", "Version metadata file", { default: "version.json" })
  .option("--output <path:string>", "Matrix result JSON path", { required: true })
  .option("--dry-run", "Skip writes to R2")
  .action(async (options) => {
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) throw new Error("GITHUB_TOKEN is required");
    const result = await collectFromFiles({
      game: options.game as Game,
      versionFile: options.versionFile,
      outputFile: options.output,
      dryRun: options.dryRun ?? false,
      githubToken,
    });
    console.log(JSON.stringify(result, null, 2));
  });

const merge = new Command()
  .description("Merge all matrix results into version metadata")
  .option("--version-file <path:string>", "Version metadata file", { default: "version.json" })
  .option("--results-directory <path:string>", "Directory containing matrix result JSON files", { required: true })
  .option("--dry-run", "Skip writes to R2")
  .action(async (options) => {
    const resultFiles = [];
    for await (const entry of Deno.readDir(options.resultsDirectory)) {
      if (entry.isFile && entry.name.endsWith(".json")) resultFiles.push(join(options.resultsDirectory, entry.name));
    }
    if (resultFiles.length === 0) throw new Error("No matrix result files found");
    await mergeResultFiles({
      versionFile: options.versionFile,
      resultFiles: resultFiles.toSorted(),
      dryRun: options.dryRun ?? false,
    });
  });

await new Command()
  .name("upstream-sync")
  .description("Synchronize and compatibility-test upstream releases")
  .command("collect", collect)
  .command("merge", merge)
  .parse(Deno.args);
