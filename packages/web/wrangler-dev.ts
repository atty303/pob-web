import { type ChildProcess, spawn } from "node:child_process";
import type { Plugin } from "vite";

type Exit = { code: number | null; signal: NodeJS.Signals | null };
const startupTimeoutMs = 30_000;

function terminate(child: ChildProcess, exit: Promise<Exit>) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
  force.unref();
  void exit.then(
    () => clearTimeout(force),
    () => clearTimeout(force),
  );
}

export function wranglerDev(): Plugin {
  return {
    name: "pob-web:wrangler-dev",
    apply: "serve",
    async configureServer(server) {
      const child = spawn(
        "wrangler",
        [
          "pages",
          "dev",
          ".",
          "--compatibility-date=2024-05-11",
          "--port=0",
          "--inspector-port=0",
          "--show-interactive-dev-session=false",
        ],
        {
          cwd: import.meta.dirname,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let output = "";
      let resolveURL: (url: string) => void;
      const url = new Promise<string>(resolve => {
        resolveURL = resolve;
      });
      const collect = (chunk: Buffer) => {
        const text = chunk.toString();
        output = `${output}${text}`.slice(-8_192);
        const match = output.match(/Ready on (http:\/\/[^\s]+)/);
        if (match) resolveURL(match[1]);
      };
      child.stdout.on("data", chunk => {
        process.stdout.write(chunk);
        collect(chunk);
      });
      child.stderr.on("data", chunk => {
        process.stderr.write(chunk);
        collect(chunk);
      });

      const exit = new Promise<Exit>((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolve({ code, signal }));
      });
      const removeExitCleanup = () => process.off("exit", cleanupOnExit);
      const cleanupOnExit = () => child.kill("SIGTERM");
      process.once("exit", cleanupOnExit);

      let target: string;
      let startupTimeout: NodeJS.Timeout | undefined;
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
        removeExitCleanup();
        terminate(child, exit);
        throw error;
      } finally {
        if (startupTimeout) clearTimeout(startupTimeout);
      }

      server.config.server.proxy ??= {};
      server.config.server.proxy["/api"] = target;

      let stopping = false;
      const stop = () => {
        if (stopping) return;
        stopping = true;
        removeExitCleanup();
        terminate(child, exit);
      };
      server.httpServer?.once("close", stop);

      void exit.then(
        ({ code, signal }) => {
          removeExitCleanup();
          if (stopping) return;
          process.exitCode = code && code !== 0 ? code : 1;
          server.config.logger.error(`Wrangler stopped unexpectedly (code ${code}, signal ${signal})`);
          void server.close();
        },
        error => {
          removeExitCleanup();
          if (stopping) return;
          process.exitCode = 1;
          server.config.logger.error("Wrangler process failed", { error });
          void server.close();
        },
      );
    },
  };
}
