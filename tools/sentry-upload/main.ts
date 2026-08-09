import { join, relative } from "@std/path";

const organization = "atty303";
const project = "pob-web";
const webBuildDirectory = "packages/web/build/client";
const webAssetsDirectory = join(webBuildDirectory, "assets");
const releaseWasm = "packages/driver/dist/release/driver.wasm";
const releaseWasmMap = `${releaseWasm}.map`;

export async function findIdenticalFile(source: string, candidates: readonly string[]): Promise<string> {
  const sourceHash = await sha256(source);
  const matches = [];
  for (const candidate of candidates) {
    if ((await sha256(candidate)) === sourceHash) matches.push(candidate);
  }
  if (matches.length !== 1) {
    throw new Error(`Expected one deployed copy of ${source}, found ${matches.length}`);
  }
  return matches[0];
}

async function sha256(path: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await Deno.readFile(path));
  return Array.from(new Uint8Array(digest), function encodeByte(byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

async function deployedWasmCandidates(): Promise<string[]> {
  const candidates = [];
  for await (const entry of Deno.readDir(webAssetsDirectory)) {
    if (entry.isFile && /^driver-.*\.wasm$/.test(entry.name)) candidates.push(join(webAssetsDirectory, entry.name));
  }
  return candidates;
}

async function runSentryCli(args: readonly string[]): Promise<void> {
  const command = new Deno.Command("sentry-cli", { args: [...args], stdout: "inherit", stderr: "inherit" });
  const { success, code } = await command.spawn().status;
  if (!success) throw new Error(`sentry-cli exited with status ${code}`);
}

async function main(): Promise<void> {
  const release = Deno.env.get("SENTRY_RELEASE");
  if (!release) throw new Error("SENTRY_RELEASE is required");
  if (!Deno.env.get("SENTRY_AUTH_TOKEN")) throw new Error("SENTRY_AUTH_TOKEN is required");

  const deployedWasm = await findIdenticalFile(releaseWasm, await deployedWasmCandidates());
  console.log(`Uploading source maps for ${release}; release Wasm is ${relative(webBuildDirectory, deployedWasm)}`);

  const commonArgs = [
    "--org",
    organization,
    "--project",
    project,
    "--release",
    release,
    "--strict",
    "--validate",
    "--wait",
  ];
  await runSentryCli(["sourcemaps", "inject", webBuildDirectory]);
  await runSentryCli(["sourcemaps", "upload", ...commonArgs, "--url-prefix", "~/", webBuildDirectory]);
  await runSentryCli([
    "sourcemaps",
    "upload",
    ...commonArgs,
    "--url-prefix",
    "~/assets",
    "--bundle",
    deployedWasm,
    "--bundle-sourcemap",
    releaseWasmMap,
  ]);
}

if (import.meta.main) await main();
