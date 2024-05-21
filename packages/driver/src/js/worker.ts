import * as zenfs from "@zenfs/core";
import { Zip } from "@zenfs/zip";
import * as Comlink from "comlink";
import type { FilesystemConfig } from "./driver.ts";
import type { UIState } from "./event.ts";
import { CloudflareKV, WebAccess } from "./fs.ts";
import { ImageRepository } from "./image";
import { log, tag } from "./logger.ts";
// @ts-ignore
import {
  BinPackingTextRasterizer,
  Renderer,
  TextMetrics,
  type TextRasterizer,
  WebGL1Backend,
  loadFonts,
} from "./renderer";
import type { SubScriptWorker } from "./sub.ts";
import WorkerObject from "./sub.ts?worker";

export class SubScriptHost {
  private worker: Worker | undefined;
  private subScriptWorker: Comlink.Remote<SubScriptWorker> | undefined;

  constructor(
    readonly script: string,
    readonly funcs: string,
    readonly subs: string,
    readonly data: Uint8Array,
    readonly onFinished: (data: Uint8Array) => void,
    readonly onError: (message: string) => void,
    readonly onFetch: HostCallbacks["onFetch"],
  ) {}

  async start() {
    this.worker = new WorkerObject();
    this.subScriptWorker = Comlink.wrap<SubScriptWorker>(this.worker);
    this.subScriptWorker
      .start(
        this.script,
        this.data,
        Comlink.proxy(this.onFinished),
        Comlink.proxy(this.onError),
        Comlink.proxy(this.onFetch),
      )
      .then(() => {});
  }

  async terminate() {
    this.worker?.terminate();
    this.worker = undefined;
  }

  isRunning() {
    return this.worker !== undefined;
  }
}

interface DriverModule extends EmscriptenModule {
  cwrap: typeof cwrap;
}

type OnFetchFunction = (
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
) => Promise<{
  body: string;
  status: number | undefined;
  headers: Record<string, string>;
  error: string | undefined;
}>;

export type HostCallbacks = {
  onError: (message: string) => void;
  onFrame: (render: boolean, time: number) => void;
  onFetch: OnFetchFunction;
};

type MainCallbacks = {
  copy: (text: string) => void;
  paste: () => Promise<string>;
  openUrl: (url: string) => void;
};

type Imports = {
  init: () => void;
  start: () => void;
  onFrame: () => void;
  onKeyUp: (name: string, doubleClick: number) => void;
  onKeyDown: (name: string, doubleClick: number) => void;
  onChar: (char: string, doubleClick: number) => void;
  onDownloadPageResult: (result: string) => void;
  onSubScriptFinished: (id: number, data: number) => number;
  onSubScriptError: (id: number, message: string) => number;
};

export class DriverWorker {
  private imageRepo: ImageRepository | undefined;
  private textMetrics: TextMetrics | undefined;
  private textRasterizer: TextRasterizer | undefined;
  private renderer: Renderer | undefined;
  private screenSize: { width: number; height: number } = {
    width: 800,
    height: 600,
  };
  private uiState: UIState = {
    x: 0,
    y: 0,
    keys: new Set(),
  };
  private hostCallbacks: HostCallbacks | undefined;
  private mainCallbacks: MainCallbacks | undefined;
  private imports: Imports | undefined;
  private dirtyCount = 0;
  private isRunning = true;
  private subScriptIndex = 1;
  private subScripts: SubScriptHost[] = [];

  async start(
    build: "debug" | "release",
    assetPrefix: string,
    fileSystemConfig: FilesystemConfig,
    onError: HostCallbacks["onError"],
    onFrame: HostCallbacks["onFrame"],
    onFetch: HostCallbacks["onFetch"],
    copy: MainCallbacks["copy"],
    paste: MainCallbacks["paste"],
    openUrl: MainCallbacks["openUrl"],
  ) {
    this.imageRepo = new ImageRepository(`${assetPrefix}/root/`);

    await loadFonts();
    this.textMetrics = new TextMetrics();
    this.textRasterizer = new BinPackingTextRasterizer(this.textMetrics);

    this.renderer = new Renderer(this.imageRepo, this.textRasterizer, this.screenSize);
    this.hostCallbacks = {
      onError,
      onFrame,
      onFetch,
    };
    this.mainCallbacks = {
      copy,
      paste,
      openUrl,
    };

    const driver = (await import(`../../dist/driver-${build}.mjs`)) as {
      default: EmscriptenModuleFactory<DriverModule>;
    };
    const module = await driver.default({
      print: console.log,
      printErr: console.warn,
    });

    const rootZip = await fetch(`${assetPrefix}/root.zip`);
    await zenfs.configure({
      mounts: {
        "/root": {
          backend: Zip,
          zipData: await rootZip.arrayBuffer(),
          name: "root.zip",
        } as any,
        "/user": {
          name: "OPFS",
          backend: WebAccess,
          handle: await navigator.storage.getDirectory(),
          // port: self as unknown as any,
        } as any,
      },
    });

    if (fileSystemConfig.cloudflareKvAccessToken) {
      const kvFs = await zenfs.resolveMountConfig({
        backend: CloudflareKV,
        prefix: fileSystemConfig.cloudflareKvPrefix,
        token: fileSystemConfig.cloudflareKvAccessToken,
      });
      if (!(await zenfs.promises.exists("/user/Path of Building/Builds/Cloud")))
        await zenfs.promises.mkdir("/user/Path of Building/Builds/Cloud");
      zenfs.mount("/user/Path of Building/Builds/Cloud", kvFs);

      if (!(await zenfs.promises.exists("/user/Path of Building/Builds/Cloud/Public")))
        await zenfs.promises.mkdir("/user/Path of Building/Builds/Cloud/Public");
    }

    Object.assign(module, this.exports(module));
    this.imports = this.resolveImports(module);

    await this.imports?.init();
    await this.imports?.start();

    if (this.isRunning) this.tick();
  }

  destroy() {
    this.isRunning = false;
  }

  setCanvas(canvas: OffscreenCanvas) {
    const backend = new WebGL1Backend(canvas);
    if (this.renderer) {
      this.renderer.backend = backend;
    }
  }

  resize(size: { width: number; height: number }) {
    this.screenSize = size;
    this.renderer?.resize(size);
    this.invalidate();
  }

  invalidate() {
    this.dirtyCount = 2;
  }

  handleMouseMove(uiState: UIState) {
    this.uiState = uiState;
    this.invalidate();
  }

  handleKeyDown(name: string, doubleClick: number, uiState: UIState) {
    this.uiState = uiState;
    this.imports?.onKeyDown(name, doubleClick);
    this.invalidate();
  }

  handleKeyUp(name: string, doubleClick: number, uiState: UIState) {
    this.uiState = uiState;
    this.imports?.onKeyUp(name, doubleClick);
    this.invalidate();
  }

  handleChar(char: string, doubleClick: number, uiState: UIState) {
    this.uiState = uiState;
    this.imports?.onChar(char, doubleClick);
    this.invalidate();
  }

  private async tick() {
    const start = performance.now();

    await this.imports?.onFrame();

    const time = performance.now() - start;
    this.hostCallbacks?.onFrame(this.dirtyCount > 0, time);
    this.dirtyCount -= 1;
    if (this.isRunning) requestAnimationFrame(this.tick.bind(this));
  }

  // js -> wasm
  private resolveImports(module: DriverModule): Imports {
    return {
      init: module.cwrap("init", "number", [], { async: true }),
      start: module.cwrap("start", "number", [], { async: true }),
      onFrame: module.cwrap("on_frame", "number", [], { async: true }),
      onKeyUp: module.cwrap("on_key_up", "number", ["string", "number"]),
      onKeyDown: module.cwrap("on_key_down", "number", ["string", "number"]),
      onChar: module.cwrap("on_char", "number", ["string", "number"]),
      onDownloadPageResult: module.cwrap("on_download_page_result", "number", ["string"]),
      onSubScriptFinished: module.cwrap("on_subscript_finished", "number", ["number", "number"]),
      onSubScriptError: module.cwrap("on_subscript_error", "number", ["number", "string"]),
    };
  }

  // wasm -> js
  private exports(module: DriverModule) {
    return {
      fs: zenfs.fs,
      onError: (message: string) => this.hostCallbacks?.onError(message),
      getScreenWidth: () => this.screenSize.width,
      getScreenHeight: () => this.screenSize.height,
      getCursorPosX: () => this.uiState.x,
      getCursorPosY: () => this.uiState.y,
      isKeyDown: (name: string) => this.uiState.keys.has(name),
      imageLoad: (handle: number, filename: string, flags: number) => {
        this.imageRepo?.load(handle, filename, flags).then(() => {
          this.invalidate();
        });
      },
      drawCommit: (bufferPtr: number, size: number) => {
        if (this.dirtyCount > 0) {
          this.renderer?.render(new DataView(module.HEAPU8.buffer, bufferPtr, size));
        }
      },
      getStringWidth: (size: number, font: number, text: string) => this.textMetrics?.measure(size, font, text) ?? 0,
      getStringCursorIndex: (size: number, font: number, text: string, cursorX: number, cursorY: number) =>
        this.textMetrics?.measureCursorIndex(size, font, text, cursorX, cursorY) ?? 0,
      copy: (text: string) => this.mainCallbacks?.copy(text),
      paste: () => this.mainCallbacks?.paste(),
      openUrl: (url: string) => this.mainCallbacks?.openUrl(url),
      launchSubScript: async (script: string, funcs: string, subs: string, size: number, data: number) => {
        const id = this.subScriptIndex;
        const dataArray = new Uint8Array(size);
        dataArray.set(new Uint8Array(module.HEAPU8.buffer, data, size));
        const subScript = new SubScriptHost(
          script,
          funcs,
          subs,
          dataArray,
          (data: Uint8Array) => {
            this.subScripts[id]?.terminate();
            delete this.subScripts[id];

            const wasmData = module._malloc(data.length);
            module.HEAPU8.set(data, wasmData);
            const ret = this.imports?.onSubScriptFinished(id, wasmData);
            module._free(wasmData);

            log.debug(tag.subscript, "onSubScriptFinished callback done", { ret });
            this.invalidate();
          },
          (message: string) => {
            this.subScripts[id]?.terminate();
            delete this.subScripts[id];

            const ret = this.imports?.onSubScriptError(id, message);
            log.debug(tag.subscript, "onSubScriptError callback done", { ret });
            this.invalidate();
          },
          this.hostCallbacks?.onFetch ??
            (() => Promise.resolve({ error: "onFetch not implemented", body: "", headers: {}, status: 500 })),
        );

        this.subScripts[id] = subScript;
        await subScript.start();
        return this.subScriptIndex++;
      },
      abortSubScript: async (id: number) => {
        await this.subScripts[id]?.terminate();
      },
      isSubScriptRunning: (id: number) => {
        return this.subScripts[id]?.isRunning() ?? false;
      },
    };
  }
}

const worker = new DriverWorker();
Comlink.expose(worker);
