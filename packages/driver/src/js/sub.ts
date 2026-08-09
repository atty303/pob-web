/// <reference types="emscripten" />

import * as Comlink from "comlink";
import { log, tag } from "./logger";
import { createRpcClient } from "./rpc";

interface DriverModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  bridge: unknown;
  rpcCall: ReturnType<typeof createRpcClient>;
}

type Imports = {
  subStart: (script: string, funcs: string, subs: string, size: number, data: number) => number;
};

export class SubScriptWorker {
  private onFinished: (data: Uint8Array) => void = () => {};
  private onError: (message: string) => void = () => {};
  async start(
    script: string,
    data: Uint8Array,
    rpcPort: MessagePort,
    onFinished: (data: Uint8Array) => void,
    onError: (message: string) => void,
  ) {
    const build = "release"; // TODO: configurable
    this.onFinished = onFinished;
    this.onError = onError;
    log.debug(tag.subscript, "start", { script });

    const driver = (await import(`../../dist/${build}/driver.mjs`)) as {
      default: EmscriptenModuleFactory<DriverModule>;
    };
    const rpcCall = createRpcClient(rpcPort);
    const module = await driver.default({
      print: console.log, // TODO: log.info
      printErr: console.warn, // TODO: log.info
      rpcCall,
    });

    module.bridge = this.resolveExports(module);
    const imports = this.resolveImports(module);

    const wasmData = module._malloc(data.length);
    module.HEAPU8.set(data, wasmData);

    try {
      const ret = imports.subStart(script, "", "", data.length, wasmData);
      if (ret !== 0) throw new Error(`sub_start failed (status=${ret})`);
      log.info(tag.subscript, `finished: ret=${ret}`);
    } finally {
      module._free(wasmData);
    }
  }

  private resolveImports(module: DriverModule): Imports {
    return {
      subStart: module.cwrap("sub_start", "number", ["string", "string", "string", "number", "number"]),
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
    };
  }
}

const worker = new SubScriptWorker();
Comlink.expose(worker);
