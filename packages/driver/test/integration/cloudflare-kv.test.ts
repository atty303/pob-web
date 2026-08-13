import { assertEquals } from "@std/assert";
import { configure, fs, resolveMountConfig } from "@zenfs/core";
import { CloudflareKV } from "../../src/js/fs.ts";

const repositoryRoot = new URL("../../../..", import.meta.url);
const kvFunction = new URL("../../../web/functions/api/kv/[[name]].ts", import.meta.url);

Deno.test("CloudflareKV persists filesystem operations through Wrangler KV", async () => {
  await using wrangler = await startWrangler();
  const prefix = `${wrangler.url}/api/kv`;

  await configureCloud(prefix);
  await fs.promises.writeFile("/build.xml", "0123456789");
  await fs.promises.writeFile("/build.xml", "saved build");
  await fs.promises.rename("/build.xml", "/renamed.xml");

  await configureCloud(prefix);
  const path = "/renamed.xml";
  assertEquals(await fs.promises.readFile(path, "utf8"), "saved build");
  assertEquals((await fs.promises.stat(path)).size, 11);
  assertEquals(await fs.promises.readdir("/"), ["renamed.xml"]);

  await configureCloud(prefix, "poe2");
  await fs.promises.writeFile("/renamed.xml", "namespace");
  assertEquals(await fs.promises.readFile("/renamed.xml", "utf8"), "namespace");

  await configureCloud(prefix);
  assertEquals(await fs.promises.readFile(path, "utf8"), "saved build");
  await fs.promises.unlink(path);
  assertEquals(await fs.promises.readdir("/"), []);
});

Deno.test("CloudflareKV preserves directories created through the VFS", async () => {
  await using wrangler = await startWrangler();
  const prefix = `${wrangler.url}/api/kv`;
  await configureCloud(prefix);

  await fs.promises.mkdir("/Nested", { recursive: true });
  assertEquals((await fs.promises.stat("/Nested")).size, 4096);
  await fs.promises.writeFile("/Nested/build.xml", "nested build");

  await configureCloud(prefix);
  assertEquals((await fs.promises.stat("/Nested")).size, 4096);
  assertEquals(await fs.promises.readdir("/Nested"), ["build.xml"]);
  assertEquals(await fs.promises.readFile("/Nested/build.xml", "utf8"), "nested build");
});

Deno.test("CloudflareKV preserves existing bytes for partial writes and truncation", async () => {
  await using wrangler = await startWrangler();
  const prefix = `${wrangler.url}/api/kv`;
  await configureCloud(prefix);

  await fs.promises.writeFile("/build.xml", "0123456789");
  const file = await fs.promises.open("/build.xml", "r+");
  await file.write(new TextEncoder().encode("cloud"), 0, 5, 2);
  await file.truncate(8);
  await file.close();

  await configureCloud(prefix);
  assertEquals(await fs.promises.readFile("/build.xml", "utf8"), "01cloud7");
  assertEquals((await fs.promises.stat("/build.xml")).size, 8);
});

Deno.test("CloudflareKV persists empty files", async () => {
  await using wrangler = await startWrangler();
  const prefix = `${wrangler.url}/api/kv`;
  await configureCloud(prefix);

  const file = await fs.promises.open("/empty.xml", "w");
  await file.close();

  await configureCloud(prefix);
  assertEquals((await fs.promises.readFile("/empty.xml")).byteLength, 0);
  assertEquals((await fs.promises.stat("/empty.xml")).size, 0);
});

Deno.test("CloudflareKV recovers non-empty files with stale zero-sized metadata", async () => {
  await using wrangler = await startWrangler();
  const prefix = `${wrangler.url}/api/kv`;
  const contents = '<PathOfBuilding name="recovered"/>';
  const response = await fetch(`${prefix}/stale.xml`, {
    method: "PUT",
    body: contents,
    headers: {
      Authorization: "Bearer integration-token",
      "x-metadata": JSON.stringify({ mode: 0o100644, size: 0 }),
    },
  });
  await response.body?.cancel();
  assertEquals(response.status, 204);

  await configureCloud(prefix);
  assertEquals(await fs.promises.readFile("/stale.xml", "utf8"), contents);
  assertEquals((await fs.promises.stat("/stale.xml")).size, new TextEncoder().encode(contents).length);
});

async function configureCloud(prefix: string, namespace?: string) {
  const cloud = await resolveMountConfig({
    backend: CloudflareKV,
    prefix,
    token: "integration-token",
    namespace,
  });
  await configure({ mounts: { "/": cloud } });
}

type WranglerServer = AsyncDisposable & { url: string };

async function startWrangler(): Promise<WranglerServer> {
  const directory = await Deno.makeTempDir({ prefix: "pob-web-zenfs-kv-" });
  let process: Deno.ChildProcess | undefined;
  let stdout: OutputCapture | undefined;
  let stderr: OutputCapture | undefined;
  try {
    const publicDirectory = `${directory}/public`;
    const functionsDirectory = `${directory}/functions/api/kv`;
    await Deno.mkdir(publicDirectory, { recursive: true });
    await Deno.mkdir(functionsDirectory, { recursive: true });
    await Deno.copyFile(kvFunction, `${functionsDirectory}/[[name]].ts`);
    await Deno.writeTextFile(
      `${functionsDirectory}/_middleware.ts`,
      `export const onRequest = async (context) => {
  if (context.request.headers.get("Authorization") !== "Bearer integration-token") {
    return new Response("Unauthorized", { status: 401 });
  }
  context.data = { sub: "integration-user" };
  return await context.next();
};
`,
    );

    let output = "";
    let resolveUrl: (url: string) => void;
    const detectedUrl = new Promise<string>((resolve) => resolveUrl = resolve);
    const detectUrl = (text: string) => {
      output = `${output}${text}`.slice(-8_192);
      const match = output.match(/Ready on (http:\/\/[^\s]+)/);
      if (match) resolveUrl(match[1]);
    };
    const wrangler = new URL("node_modules/.bin/wrangler", repositoryRoot).pathname;
    process = new Deno.Command(wrangler, {
      args: [
        "pages",
        "dev",
        publicDirectory,
        "--cwd",
        directory,
        "--ip",
        "127.0.0.1",
        "--port",
        "0",
        "--inspector-port",
        "0",
        "--compatibility-date",
        "2024-05-11",
        "--kv",
        "KV",
        "--persist-to",
        `${directory}/state`,
        "--show-interactive-dev-session=false",
      ],
      env: {
        ...Deno.env.toObject(),
        XDG_CONFIG_HOME: `${directory}/config`,
        XDG_CACHE_HOME: `${directory}/cache`,
        WRANGLER_LOG_PATH: `${directory}/wrangler.log`,
      },
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    stdout = capture(process.stdout, detectUrl);
    stderr = capture(process.stderr, detectUrl);
    const url = await waitForWrangler(detectedUrl, process);

    return {
      url,
      async [Symbol.asyncDispose]() {
        await cleanupWrangler(directory, process, stdout, stderr);
      },
    };
  } catch (error) {
    await cleanupWrangler(directory, process, stdout, stderr);
    throw new Error(`${error}\nstdout:\n${stdout?.text ?? ""}\nstderr:\n${stderr?.text ?? ""}`);
  }
}

async function waitForWrangler(detectedUrl: Promise<string>, process: Deno.ChildProcess) {
  const url = await Promise.race([
    detectedUrl,
    process.status.then((status) => {
      throw new Error(`Wrangler exited before becoming ready (code ${status.code})`);
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Wrangler startup timed out")), 30_000)),
  ]);
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/kv/`, {
        headers: { Authorization: "Bearer integration-token" },
        signal: AbortSignal.timeout(500),
      });
      await response.body?.cancel();
      if (response.ok) return url;
    } catch {
      // Wrangler reported its URL before the route became available.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Wrangler did not become ready at ${url}`);
}

type OutputCapture = { readonly text: string; cancel(): Promise<void>; done: Promise<void> };

function capture(stream: ReadableStream<Uint8Array>, onText: (text: string) => void): OutputCapture {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const done = (async () => {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = decoder.decode(result.value, { stream: true });
      text += chunk;
      onText(chunk);
    }
    const final = decoder.decode();
    text += final;
    onText(final);
  })();
  return {
    get text() {
      return text;
    },
    async cancel() {
      await reader.cancel();
    },
    done,
  };
}

async function cleanupWrangler(
  directory: string,
  process?: Deno.ChildProcess,
  stdout?: OutputCapture,
  stderr?: OutputCapture,
) {
  try {
    if (process) await terminate(process);
  } finally {
    await Promise.allSettled([stdout?.cancel(), stderr?.cancel(), stdout?.done, stderr?.done]);
    await Deno.remove(directory, { recursive: true }).catch((error) => {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    });
  }
}

async function terminate(process: Deno.ChildProcess) {
  try {
    process.kill("SIGTERM");
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound) && !(error instanceof TypeError)) throw error;
  }
  const exited = await Promise.race([
    process.status.then(() => true),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (exited) return;
  try {
    process.kill("SIGKILL");
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound) && !(error instanceof TypeError)) throw error;
  }
  await Promise.race([
    process.status,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Wrangler did not exit after SIGKILL")), 5_000)
    ),
  ]);
}
