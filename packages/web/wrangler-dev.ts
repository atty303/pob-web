import type { Plugin } from "vite";

type Exit = { code: number; signal: string | null };
const startupTimeoutMs = 30_000;

function terminate(child: Deno.ChildProcess, exit: Promise<Exit>) {
  try {
    child.kill("SIGTERM");
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    return;
  }

  const force = setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }, 5_000);
  void exit.finally(() => clearTimeout(force));
}

export function wranglerDev(): Plugin {
  return {
    name: "pob-web:wrangler-dev",
    apply: "serve",
    async configureServer(server) {
      const child = new Deno.Command("wrangler", {
        args: [
          "pages",
          "dev",
          ".",
          "--compatibility-date=2024-05-11",
          "--port=0",
          "--inspector-port=0",
          "--show-interactive-dev-session=false",
        ],
        cwd: import.meta.dirname,
        stdin: "null",
        stdout: "piped",
        stderr: "piped",
      }).spawn();

      let output = "";
      let resolveURL: (url: string) => void;
      const url = new Promise<string>((resolve) => resolveURL = resolve);
      const collect = (text: string) => {
        output = `${output}${text}`.slice(-8_192);
        const match = output.match(/Ready on (http:\/\/[^\s]+)/);
        if (match) resolveURL(match[1]);
      };
      void forward(child.stdout, Deno.stdout, collect);
      void forward(child.stderr, Deno.stderr, collect);

      const exit = child.status.then(({ code, signal }) => ({ code, signal }));
      const cleanupOnUnload = () => terminate(child, exit);
      globalThis.addEventListener("unload", cleanupOnUnload, { once: true });
      const removeUnloadCleanup = () => globalThis.removeEventListener("unload", cleanupOnUnload);

      let target: string;
      let startupTimeout: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<never>((_, reject) => {
        startupTimeout = setTimeout(
          () => reject(new Error(`Wrangler did not become ready within ${startupTimeoutMs}ms`)),
          startupTimeoutMs,
        );
      });
      try {
        target = await Promise.race([
          url,
          exit.then(({ code, signal }) => {
            throw new Error(`Wrangler exited before it was ready (code ${code}, signal ${signal})`);
          }),
          timedOut,
        ]);
      } catch (error) {
        removeUnloadCleanup();
        terminate(child, exit);
        throw error;
      } finally {
        if (startupTimeout !== undefined) clearTimeout(startupTimeout);
      }

      server.config.server.proxy ??= {};
      server.config.server.proxy["/api"] = target;

      let stopping = false;
      const stop = () => {
        if (stopping) return;
        stopping = true;
        removeUnloadCleanup();
        terminate(child, exit);
      };
      server.httpServer?.once("close", stop);

      void exit.then(({ code, signal }) => {
        removeUnloadCleanup();
        if (stopping) return;
        Deno.exitCode = code !== 0 ? code : 1;
        server.config.logger.error(`Wrangler stopped unexpectedly (code ${code}, signal ${signal})`);
        void server.close();
      });
    },
  };
}

async function forward(
  stream: ReadableStream<Uint8Array>,
  destination: { write(data: Uint8Array): Promise<number> },
  collect: (text: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    await destination.write(chunk);
    collect(decoder.decode(chunk, { stream: true }));
  }
  collect(decoder.decode());
}
