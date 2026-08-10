import { assertEquals, assertRejects } from "@std/assert";
import type { GraphqlClient } from "./github.ts";
import type { Versions } from "./model.ts";
import { collectGameResult, mergeResultFiles, type MiseRunner } from "./sync.ts";

function versions(): Versions {
  return {
    poe1: { head: "v1", versions: [{ value: "v1", date: "2026-01-01T00:00:00Z" }] },
    poe2: { head: "v1", versions: [{ value: "v1", date: "2026-01-01T00:00:00Z" }] },
    le: { head: "v1", versions: [{ value: "v1", date: "2026-01-01T00:00:00Z" }] },
  };
}

function graphql(): GraphqlClient {
  return () =>
    Promise.resolve({
      data: {
        repository: {
          refs: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              { name: "v3", target: { committedDate: "2026-03-01T00:00:00Z" } },
              { name: "v2", target: { committedDate: "2026-02-01T00:00:00Z" } },
            ],
          },
        },
      },
    });
}

Deno.test("collectGameResult syncs each release and records E2E failures without stopping", async () => {
  const commands: string[][] = [];
  const runner: MiseRunner = (args) => {
    commands.push([...args]);
    const failed = args.includes("v3") && args[0] === "test:e2e:driver";
    return Promise.resolve(failed ? 1 : 0);
  };

  const result = await collectGameResult({
    game: "poe1",
    versions: versions(),
    dryRun: false,
    runner,
    graphql: graphql(),
  });

  assertEquals(result.releases.map((release) => release.testResult), ["failed", "tested"]);
  assertEquals(commands, [
    ["visual:setup"],
    ["driver:build"],
    ["pack", "--game", "poe1", "--tag", "v3"],
    ["sync", "--game", "poe1", "--tag", "v3"],
    ["test:e2e:driver", "--game", "poe1", "--version", "v3"],
    ["pack", "--game", "poe1", "--tag", "v2"],
    ["sync", "--game", "poe1", "--tag", "v2"],
    ["test:e2e:driver", "--game", "poe1", "--version", "v2"],
  ]);
});

Deno.test("collectGameResult dry run skips R2 asset sync", async () => {
  const commands: string[][] = [];
  await collectGameResult({
    game: "le",
    versions: versions(),
    dryRun: true,
    graphql: graphql(),
    runner: (args) => {
      commands.push([...args]);
      return Promise.resolve(0);
    },
  });
  assertEquals(commands.some((command) => command[0] === "sync"), false);
  const e2eCommands = commands.filter((command) => command[0] === "test:e2e:driver");
  assertEquals(e2eCommands.length, 2);
});

Deno.test("collectGameResult stops when a prerequisite fails", async () => {
  await assertRejects(
    () =>
      collectGameResult({
        game: "poe2",
        versions: versions(),
        dryRun: false,
        graphql: graphql(),
        runner: (args) => (args[0] === "driver:build" ? Promise.reject(new Error("build failed")) : Promise.resolve(0)),
      }),
    Error,
    "build failed",
  );
});

Deno.test("mergeResultFiles writes one combined metadata file and uploads only outside dry run", async () => {
  const directory = await Deno.makeTempDir();
  try {
    const versionFile = `${directory}/version.json`;
    const resultFile = `${directory}/poe1.json`;
    await Deno.writeTextFile(versionFile, JSON.stringify(versions()));
    await Deno.writeTextFile(
      resultFile,
      JSON.stringify({
        game: "poe1",
        releases: [{ value: "v2", date: "2026-02-01T00:00:00Z", testResult: "tested" }],
      }),
    );

    const commands: string[][] = [];
    await mergeResultFiles({
      versionFile,
      resultFiles: [resultFile],
      dryRun: false,
      runner: (args) => {
        commands.push([...args]);
        return Promise.resolve(0);
      },
    });

    const merged = JSON.parse(await Deno.readTextFile(versionFile));
    assertEquals(merged.poe1.head, "v2");
    assertEquals(commands, [["sync:metadata", "--file", versionFile]]);

    await Deno.writeTextFile(versionFile, JSON.stringify(versions()));
    await mergeResultFiles({
      versionFile,
      resultFiles: [resultFile],
      dryRun: true,
      runner: () => Promise.reject(new Error("dry run attempted an upload")),
    });
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
