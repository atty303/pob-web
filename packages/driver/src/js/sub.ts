/// <reference types="emscripten" />

import * as Comlink from "comlink";
import { log, tag } from "./logger";

interface DriverModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  bridge: unknown;
}

type Imports = {
  subStart: (script: string, funcs: string, subs: string, size: number, data: number) => void;
};

export class SubScriptWorker {
  private onFinished: (data: Uint8Array) => void = () => {};
  private onError: (message: string) => void = () => {};
  private onFetch: (
    url: string,
    header: Record<string, string>,
    body: string | undefined,
  ) => Promise<{
    body: string | undefined;
    headers: Record<string, string>;
    status: number | undefined;
    error: string | undefined;
  }> = async () => ({ body: undefined, headers: {}, status: undefined, error: undefined });

  async start(
    script: string,
    data: Uint8Array,
    onFinished: (data: Uint8Array) => void,
    onError: (message: string) => void,
    onFetch: (
      url: string,
      header: Record<string, string>,
      body: string | undefined,
    ) => Promise<{
      body: string | undefined;
      headers: Record<string, string>;
      status: number | undefined;
      error: string | undefined;
    }>,
  ) {
    const build = "release"; // TODO: configurable
    this.onFinished = onFinished;
    this.onError = onError;
    this.onFetch = onFetch;
    log.debug(tag.subscript, "start", { script });

    const driver = (await import(`../../dist/${build}/driver.mjs`)) as {
      default: EmscriptenModuleFactory<DriverModule>;
    };
    const module = await driver.default({
      print: console.log, // TODO: log.info
      printErr: console.warn, // TODO: log.info
    });

    module.bridge = this.resolveExports(module);
    const imports = this.resolveImports(module);

    const wasmData = module._malloc(data.length);
    module.HEAPU8.set(data, wasmData);

    try {
      const ret = await imports.subStart(script, "", "", data.length, wasmData);
      log.info(tag.subscript, `finished: ret=${ret}`);
    } finally {
      module._free(wasmData);
    }
  }

  private resolveImports(module: DriverModule): Imports {
    return {
      subStart: module.cwrap("sub_start", "number", ["string", "string", "string", "number", "number"], {
        async: true,
      }),
    };
  }

  private resolveExports(module: DriverModule) {
    return {
      onSubScriptError: (message: string) => {
        log.error(tag.subscript, "onSubScriptError", { message });
        this.onError(message);
      },
      onSubScriptFinished: (data: number, size: number) => {
        const result = module.HEAPU8.slice(data, data + size);
        log.debug(tag.subscript, "onSubScriptFinished", { result });
        this.onFinished(result);
      },
      fetch: async (url: string, header: string | undefined, body: string | undefined) => {
        if (header?.includes("POESESSID")) {
          return JSON.stringify({ error: "POESESSID is not allowed to be sent to the server" });
        }
        try {
          log.debug(tag.subscript, "fetch request", { url, header, body });
          const headers: Record<string, string> = header
            ? header
                .split("\n")
                .map(_ => _.split(":"))
                .filter(_ => _.length === 2)
                .reduce((acc, [k, v]) => Object.assign(acc, { [k.trim()]: v.trim() }), {})
            : {};
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
          }

          const r = await this.onFetch(url, headers, body);
          log.debug(tag.subscript, "fetch", r.body, r.status, r.error);

          const headerText = Object.entries(r?.headers ?? {})
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          return JSON.stringify({
            body: r?.body,
            status: r?.status,
            header: headerText,
            error: r?.error,
          });
        } catch (e) {
          log.error(tag.subscript, "fetch error", { error: e });
          return JSON.stringify({ error: (e as Error).message });
        }
      },
    };
  }
}

const worker = new SubScriptWorker();
Comlink.expose(worker);
