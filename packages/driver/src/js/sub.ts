import * as Comlink from "comlink";
import { log, tag } from "./logger.ts";

interface DriverModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  bridge: unknown;
}

type Imports = {
  subStart: (script: string, funcs: string, subs: string, size: number, data: number) => void;
};

export class SubScriptWorker {
  private onFinish: () => void = () => {};

  async start(script: string, data: Uint8Array, onFinish: () => void) {
    const build = "release"; // TODO: configurable
    this.onFinish = onFinish;
    log.debug(tag.subscript, "start", { script });

    const driver = (await import(`../../dist/driver-${build}.mjs`)) as {
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

    await imports.subStart(script, "", "", data.length, wasmData);
  }

  private resolveImports(module: DriverModule): Imports {
    return {
      subStart: module.cwrap("sub_start", "number", ["string", "string", "string", "number", "number"], { async: true }),
    };
  }

  private resolveExports(module: DriverModule) {
    return {};
  }
}

const worker = new SubScriptWorker();
Comlink.expose(worker);
