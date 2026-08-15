const organization = "atty303";
const project = "pob-web";
const webBuildDirectory = "packages/web/build/client";
const releaseWasmDebug = "packages/driver/dist/release/driver.wasm.debug.wasm";
const uploadAttempts = 3;

type Pause = (milliseconds: number) => Promise<void>;

const transientTransportFailure =
  /connection reset|connection timed out|unexpected eof|failure when receiving data from the peer|network is unreachable|temporary failure in name resolution/i;

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function isTransientSentryCliFailure(output: string): boolean {
  return transientTransportFailure.test(output);
}

export async function retrySentryUpload<T>(
  name: string,
  upload: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  attempts = uploadAttempts,
  wait: Pause = pause,
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await upload();
    } catch (error) {
      if (attempt === attempts || !isRetryable(error)) throw error;
      const delay = attempt * 1_000;
      console.warn(`Sentry ${name} failed (attempt ${attempt}/${attempts}); retrying in ${delay / 1_000}s`);
      await wait(delay);
    }
  }

  throw new Error(`Sentry ${name} did not run`);
}

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
  const { success, code, stdout, stderr } = await new Deno.Command("sentry-cli", { args: [...args] }).output();
  await Deno.stdout.write(stdout);
  await Deno.stderr.write(stderr);
  if (!success) {
    throw new Error(`sentry-cli exited with status ${code}: ${new TextDecoder().decode(stderr)}`);
  }
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
  await retrySentryUpload(
    "source map upload",
    () => runSentryCli(["sourcemaps", "upload", ...commonArgs, "--url-prefix", "~/", webBuildDirectory]),
    (error) => error instanceof Error && isTransientSentryCliFailure(error.message),
  );
  await retrySentryUpload(
    "Wasm debug upload",
    () => runSentryCli(wasmDebugUploadArgs()),
    (error) => error instanceof Error && isTransientSentryCliFailure(error.message),
  );
}

if (import.meta.main) await main();
