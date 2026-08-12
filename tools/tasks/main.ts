import { Command, EnumType } from "@cliffy/command";
import $ from "@david/dax";
import { walk } from "@std/fs";
import { type Game, games } from "../../packages/game/src/index.ts";

const gameType = new EnumType(games);

const setup = new Command().description("Set up dependencies, submodules, and repository hooks").action(async () => {
  await $`deno ci`;
  await $`git submodule update --init --recursive`;
  await $`hk install --mise`;
});

const check = new Command()
  .description("Run generated-file and static checks")
  .arguments("[files...:string]")
  .action(async (_options, ...files: string[]) => {
    await $`deno task --filter pob-web typegen`;
    await $`hk check ${files.length === 0 ? ["--all"] : files}`;
  });

const fix = new Command()
  .description("Fix formatting and lint issues")
  .arguments("[files...:string]")
  .action(async (_options, ...files: string[]) => {
    await $`hk fix ${files.length === 0 ? ["--all"] : files}`;
  });

const test = new Command().description("Run the complete reproducible validation suite").action(async () => {
  for (
    const task of [
      "check",
      "test:driver",
      "test:web",
      "test:sentry-upload",
      "test:upstream-sync",
      "test:driver:debuginfo",
      "web:build",
    ]
  ) {
    await runMise(task);
  }
  await verifyWebBuild();
});

const testTool = new Command()
  .description("Run static and unit checks for a repository tool")
  .type("tool", new EnumType(["sentry-upload", "upstream-sync"] as const))
  .arguments("<tool:tool>")
  .action(async (_options, tool) => {
    const directory = `tools/${tool}`;
    await $`deno fmt --check deno.json ${directory}`;
    await $`deno lint ${directory}`;
    await $`deno check ${directory}`;
    await $`deno test --no-check --allow-read --allow-write ${directory}`;
    if (tool === "upstream-sync") await $`deno run ${directory}/main.ts --help`;
  });

const driverBuild = new Command()
  .description("Build the driver package")
  .type("kind", new EnumType(["debug", "release", "all"] as const))
  .option("--kind <kind:kind>", "Build variant", { default: "all" })
  .action(async (options) => {
    const kinds = options.kind === "all" ? ["debug", "release"] as const : [options.kind] as const;
    for (const kind of kinds) await buildDriver(kind);
  });

const driverDebugInfo = new Command().description("Verify production Wasm debug information").action(async () => {
  const release = "packages/driver/dist/release/driver.wasm";
  const debug = `${release}.debug.wasm`;
  if (!await pathExists(debug)) throw new Error(`Missing debug sidecar: ${debug}`);
  const releaseHeaders = await $`llvm-objdump -h ${release}`.text();
  if (!releaseHeaders.includes("build_id")) throw new Error("Release Wasm is missing build_id");
  if (!releaseHeaders.includes("external_debug_info")) throw new Error("Release Wasm is missing external_debug_info");
  if (/\s[.]debug_/.test(releaseHeaders)) throw new Error("Release Wasm contains DWARF sections");
  const debugHeaders = await $`llvm-objdump -h ${debug}`.text();
  if (!debugHeaders.includes(".debug_info")) throw new Error("Debug sidecar is missing .debug_info");
  for (const file of [release, debug]) {
    const result = await $`sentry-cli debug-files check ${file}`.text();
    if (!result.includes("Usable: yes")) throw new Error(`Sentry does not recognize ${file} as usable`);
  }
});

const e2eDriver = new Command()
  .description("Run local driver runtime tests")
  .type("game", gameType)
  .option("--game <game:game>", "Game to test")
  .option("--version <version:string>", "Game version; requires --game")
  .action(async (options) => {
    if (options.version && !options.game) throw new Error("--version requires --game");
    setOptionalEnv("RUN_GAME", options.game);
    setOptionalEnv("RUN_VERSION", options.version);
    await $`deno run --allow-env --allow-read --allow-run=mise tools/pack-e2e-assets.ts --suite driver`;
    await $`deno task --filter pob-driver test:e2e`;
  });

const e2eDriverBc7 = new Command().description("Run the BC7 CPU fallback browser test").action(async () => {
  Deno.env.set("RUN_GAME", "poe2");
  await $`deno run --allow-env --allow-read --allow-run=mise tools/pack-e2e-assets.ts --suite driver`;
  Deno.env.set("BPTC_SUPPORT_OVERRIDE", "false");
  await $`deno task --filter pob-driver test:e2e:bc7`;
});

const e2eWeb = new Command().description("Run the local web-to-driver critical-path test").action(async () => {
  await $`deno run --allow-env --allow-read --allow-run=mise tools/pack-e2e-assets.ts --suite web`;
  await $`deno task --filter pob-web test:e2e`;
});

const pack = new Command()
  .description("Pack an upstream release")
  .type("game", gameType)
  .option("--game <game:game>", "Game to pack", { required: true })
  .option("--tag <tag:string>", "Upstream tag", { required: true })
  .action(async (options) => {
    await $`deno task --filter pob-packer pack ${options.tag} ${options.game} clone`;
  });

const driverDev = new Command()
  .description("Start the driver development server")
  .type("game", gameType)
  .type("build", new EnumType(["debug", "release"] as const))
  .option("--game <game:game>", "Game to run")
  .option("--version <version:string>", "Game version")
  .option("--build <build:build>", "Build variant", { default: "release" })
  .option("--pob-cool-asset", "Use remote packed assets")
  .action(async (options) => {
    setOptionalEnv("RUN_GAME", options.game);
    setOptionalEnv("RUN_VERSION", options.version);
    Deno.env.set("RUN_BUILD", options.build);
    setOptionalEnv("POB_COOL_ASSET", options.pobCoolAsset ? "true" : undefined);
    await $`deno task --filter pob-driver dev --port 5173 --strictPort`;
  });

const webDev = new Command()
  .description("Start the web development server")
  .option("--pob-cool-asset", "Use remote packed assets")
  .action(async (options) => {
    setOptionalEnv("POB_COOL_ASSET", options.pobCoolAsset ? "true" : undefined);
    await $`deno task --filter pob-web dev`;
  });

const visualDev = new Command()
  .description("Start the driver UI for visual verification")
  .type("game", gameType)
  .type("build", new EnumType(["debug", "release"] as const))
  .option("--game <game:game>", "Game to run", { default: "poe2" })
  .option("--version <version:string>", "Game version; defaults to the current head")
  .option("--build <build:build>", "Build variant", { default: "release" })
  .option("--pob-cool-asset", "Use remote packed assets")
  .action(async (options) => {
    const version = options.version ?? await headVersion(options.game as Game);
    Deno.env.set("RUN_GAME", options.game);
    Deno.env.set("RUN_VERSION", version);
    Deno.env.set("RUN_BUILD", options.build);
    setOptionalEnv("POB_COOL_ASSET", options.pobCoolAsset ? "true" : undefined);
    if (!options.pobCoolAsset) {
      const asset = `packages/packer/r2/games/${options.game}/versions/${version}/root.zip`;
      if (!await pathExists(asset)) {
        throw new Error(`Local assets are missing. Run: mise run pack --game ${options.game} --tag ${version}`);
      }
    }
    await $`deno task --filter pob-driver dev --host 127.0.0.1`;
  });

const webDeploy = new Command().description("Build, upload source maps, and deploy the web package").action(
  async () => {
    Deno.env.set("DEPLOYMENT", "cloudflare");
    await $`deno task --filter pob-web build`;
    await runMise("sentry:upload");
    await $`deno task --filter pob-web deploy:pages`;
  },
);

const sentryLive = new Command().description("Verify live Wasm symbolication through Sentry").action(async () => {
  const token = requiredEnv("SENTRY_LIVE_AUTH_TOKEN");
  requiredEnv("SENTRY_LIVE_DSN");
  Deno.env.set("SENTRY_AUTH_TOKEN", token);
  const org = Deno.env.get("SENTRY_LIVE_ORG") ?? "atty303";
  const project = Deno.env.get("SENTRY_LIVE_PROJECT") ?? "pob-web";
  await $`sentry-cli debug-files upload --org ${org} --project ${project} --type wasm --include-sources --wait packages/driver/dist/release/driver.wasm.debug.wasm`;
  await $`deno run --allow-env --allow-read --allow-run=mise tools/pack-e2e-assets.ts --suite web`;
  Deno.env.set("SENTRY_LIVE_TEST", "1");
  await $`deno task --filter pob-web test:e2e sentry-wasm.spec.mts`;
});

const benchmarkDriver = new Command().description("Benchmark the release driver").action(async () => {
  Deno.env.set("RUN_GAME", "poe1");
  Deno.env.set("RUN_VERSION", "v2.66.2");
  Deno.env.set("RUN_BUILD", "release");
  Deno.env.delete("POB_COOL_ASSET");
  await $`deno run --allow-env --allow-read --allow-run=mise tools/pack-e2e-assets.ts --suite driver`;
  await buildDriver("release");
  await $`deno task --filter pob-driver test:performance`;
});

const playwrightMcp = new Command().description("Start Playwright MCP in Vision Mode").action(async () => {
  const { chromium } = await import("@playwright/test");
  const executable = chromium.executablePath();
  if (!await pathExists(executable)) throw new Error("Chromium is not installed; run 'mise run visual:setup' first");
  const args = ["--caps=vision", "--isolated", "--viewport-size=1440x900", `--executable-path=${executable}`];
  if (Deno.env.get("PLAYWRIGHT_MCP_HEADED") !== "1") args.push("--headless");
  await $`deno task playwright-mcp ${args}`;
});

await new Command()
  .name("pob-web-task")
  .description("Repository task runner")
  .command("setup", setup)
  .command("check", check)
  .command("fix", fix)
  .command("test", test)
  .command("test-tool", testTool)
  .command("driver-build", driverBuild)
  .command("driver-debug-info", driverDebugInfo)
  .command("test-e2e-driver", e2eDriver)
  .command("test-e2e-driver-bc7", e2eDriverBc7)
  .command("test-e2e-web", e2eWeb)
  .command("pack", pack)
  .command("driver-dev", driverDev)
  .command("web-dev", webDev)
  .command("visual-dev", visualDev)
  .command("web-deploy", webDeploy)
  .command("sentry-live", sentryLive)
  .command("benchmark-driver", benchmarkDriver)
  .command("playwright-mcp", playwrightMcp)
  .parse(Deno.args);

async function runMise(task: string, ...args: string[]): Promise<void> {
  await $`mise run ${task} ${args}`;
}

async function buildDriver(kind: "debug" | "release"): Promise<void> {
  const cmakeKind = kind === "debug" ? "Debug" : "Release";
  await $`cmake -E rm -rf packages/driver/dist/${kind}`;
  await $`emcmake cmake --fresh -G Ninja -B packages/driver/build -S packages/driver -DCMAKE_BUILD_TYPE=${cmakeKind}`;
  Deno.env.set("EMCC_FORCE_STDLIBS", "libc");
  await $`emmake ninja -C packages/driver/build`;
}

async function verifyWebBuild(): Promise<void> {
  for await (const entry of walk("packages/web/build/client", { includeDirs: false })) {
    if (entry.name.endsWith(".debug.wasm")) throw new Error(`Web build contains Wasm debug sidecar: ${entry.path}`);
  }
}

async function headVersion(game: Game): Promise<string> {
  const versions = JSON.parse(await Deno.readTextFile("version.json")) as Record<Game, { head: string }>;
  return versions[game].head;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

function setOptionalEnv(name: string, value: string | undefined): void {
  if (value === undefined) Deno.env.delete(name);
  else Deno.env.set(name, value);
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}
