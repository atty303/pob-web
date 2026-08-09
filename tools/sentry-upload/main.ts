const organization = "atty303";
const project = "pob-web";
const webBuildDirectory = "packages/web/build/client";
const releaseWasmDebug = "packages/driver/dist/release/driver.wasm.debug.wasm";

export function wasmDebugUploadArgs(path = releaseWasmDebug): string[] {
  return [
    "debug-files",
    "upload",
    "--org",
    organization,
    "--project",
    project,
    "--type",
    "wasm",
    "--include-sources",
    "--wait",
    path,
  ];
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

  console.log(`Uploading source maps and Wasm debug information for ${release}`);

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
  await runSentryCli(wasmDebugUploadArgs());
}

if (import.meta.main) await main();
