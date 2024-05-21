import * as Comlink from "comlink";
import { log, tag } from "./logger.ts";

interface DriverModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  bridge: unknown;
}

type Imports = {
  subStart: () => void;
};

export class SubScriptWorker {
  private onFinish: () => void = () => {};

  async start(script: string, onFinish: () => void) {
    const build = "release";
    this.onFinish = onFinish;
    log.debug(tag.subscript, "start", { script });

    const driver = (await import(`../../dist/driver-${build}.mjs`)) as {
      default: EmscriptenModuleFactory<DriverModule>;
    };
    const module = await driver.default({
      print: console.log,
      printErr: console.warn,
    });

    module.bridge = this.resolveExports(module);
    const imports = this.resolveImports(module);
    await imports.subStart();
  }

  private resolveImports(module: DriverModule): Imports {
    return {
      subStart: module.cwrap("sub_start", "number", [], { async: true }),
    };
  }

  private resolveExports(module: DriverModule) {
    return {};
  }
}

const worker = new SubScriptWorker();
Comlink.expose(worker);
