import * as Comlink from "comlink";
import { markEnvironmentError } from "./error.ts";
import { ImageRepository } from "./image.ts";
import type { PoBKey } from "./keyboard.ts";
import { log, tag } from "./logger.ts";
import type { MouseState } from "./mouse-handler.ts";
import {
  BinPackingTextRasterizer,
  loadFonts,
  Renderer,
  type RenderStats,
  TextMetrics,
  type TextRasterizer,
  WebGL1Backend,
  WebGPUBackend,
} from "./renderer/index.ts";
import { createRpcClient } from "./rpc.ts";
import { registerSentryWasm } from "./sentry-wasm.ts";

const setSentryWasmCodeFile = registerSentryWasm(self);
const debugWasmUrl = new URL("../../dist/debug/driver.wasm", import.meta.url).href;
const releaseWasmUrl = new URL("../../dist/release/driver.wasm", import.meta.url).href;

interface DriverModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  rpcCall: ReturnType<typeof createRpcClient>;
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
  onError: (error: unknown) => void;
  onFrame: (at: number, time: number, stats?: RenderStats) => void;
  onFetch: OnFetchFunction;
  onTitleChange: (title: string) => void;
};

type MainCallbacks = {
  copy: (text: string) => void;
  openUrl: (url: string) => void;
};

type Imports = {
  init: () => void;
  start: () => void;
  loadBuildFromCode: (code: string) => number;
  getBuildCode: () => string;
  onFrame: () => void;
  sentryTestCrash: () => void;
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
  private screenSize: { width: number; height: number; pixelRatio: number } = {
    width: 800,
    height: 600,
    pixelRatio: 1,
  };
  private mouseState: MouseState = { x: 0, y: 0 };
  private pressedKeys: Set<PoBKey> = new Set();
  private hostCallbacks: Omit<HostCallbacks, "onFetch"> | undefined;
  private mainCallbacks: MainCallbacks | undefined;
  private imports: Imports | undefined;
  private dirtyCount = 0;
  private _frameScheduled = false;
  private visible = false;

  async start(
    build: "debug" | "release",
    assetPrefix: string,
    rpcPort: MessagePort,
    eventPort: MessagePort,
    onError: HostCallbacks["onError"],
    onFrame: HostCallbacks["onFrame"],
    onTitleChange: HostCallbacks["onTitleChange"],
    copy: MainCallbacks["copy"],
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
      onTitleChange,
    };
    this.mainCallbacks = {
      copy,
      openUrl,
    };

    let driver: { default: EmscriptenModuleFactory<DriverModule> };
    try {
      driver = (await import(`../../dist/${build}/driver.mjs`)) as typeof driver;
    } catch (error) {
      throw markEnvironmentError(error, "assetLoad");
    }
    const wasmUrl = build === "release" ? releaseWasmUrl : debugWasmUrl;
    setSentryWasmCodeFile(wasmUrl);
    let wasmBinary: ArrayBuffer;
    try {
      const response = await fetch(wasmUrl);
      if (!response.ok) throw new Error(`Failed to load driver Wasm (${response.status} ${response.statusText})`);
      wasmBinary = await response.arrayBuffer();
    } catch (error) {
      throw markEnvironmentError(error, "assetLoad");
    }
    const rpcCall = createRpcClient(rpcPort);
    const module = await driver.default({
      print: console.log,
      printErr: console.warn,
      rpcCall,
      wasmBinary,
    });

    Object.assign(module, this.exports(module));
    this.imports = this.resolveImports(module);
    eventPort.onmessage = ({
      data,
    }: MessageEvent<{
      type: "subscript_finished" | "subscript_error";
      id: number;
      data?: Uint8Array;
      message?: string;
    }>) => {
      if (data.type === "subscript_finished") {
        const result = data.data ?? new Uint8Array();
        const wasmData = module._malloc(result.length);
        module.HEAPU8.set(result, wasmData);
        this.imports?.onSubScriptFinished(data.id, wasmData);
        module._free(wasmData);
      } else {
        this.imports?.onSubScriptError(data.id, data.message ?? "Subscript failed");
      }
      this.invalidate();
    };
    eventPort.start();

    this.imports?.init();
    this.imports?.start();
    this.invalidate();
  }

  destroy() {}

  async setCanvas(canvas: OffscreenCanvas, useWebGPU: boolean) {
    try {
      if (useWebGPU && "gpu" in navigator) {
        const backend = new WebGPUBackend(canvas);
        await backend.waitForInit();
        if (this.renderer) {
          this.renderer.backend = backend;
        }
        log.info(tag.backend, "Using WebGPU backend");
      } else {
        const backend = new WebGL1Backend(canvas);
        if (this.renderer) {
          this.renderer.backend = backend;
        }
        log.info(tag.backend, "Using WebGL2 backend");
      }
    } catch (error) {
      log.warn(tag.backend, "Failed to initialize WebGPU, falling back to WebGL2", error);
      const backend = new WebGL1Backend(canvas);
      if (this.renderer) {
        this.renderer.backend = backend;
      }
    }
  }

  resize(size: { width: number; height: number; pixelRatio: number }) {
    this.screenSize = size;
    this.renderer?.resize(size);
    this.invalidate();
  }

  invalidate() {
    this.dirtyCount = 2;
    this.scheduleFrame();
  }

  private scheduleFrame() {
    if (!this._frameScheduled) {
      this._frameScheduled = true;
      requestAnimationFrame(() => this.tick());
    }
  }

  updateMouseState(mouseState: MouseState) {
    this.mouseState = mouseState;
  }

  updateKeyboardState(keys: Set<PoBKey>) {
    this.pressedKeys = keys;
  }

  handleMouseMove(mouseState: MouseState) {
    this.mouseState = mouseState;
    this.invalidate();
  }

  handleKeyDown(name: string, doubleClick: number) {
    this.imports?.onKeyDown(name, doubleClick);
    this.invalidate();
  }

  handleKeyUp(name: string, doubleClick: number) {
    this.imports?.onKeyUp(name, doubleClick);
    this.invalidate();
  }

  handleChar(char: string, doubleClick: number) {
    this.imports?.onChar(char, doubleClick);
    this.invalidate();
  }

  handleVisibilityChange(visible: boolean) {
    this.visible = visible;
    if (visible) {
      this.invalidate();
    }
  }

  async loadBuildFromCode(code: string) {
    const status = this.imports?.loadBuildFromCode(code);
    if (status !== undefined && status !== 0) {
      throw new Error(`loadBuildFromCode failed (status=${status})`);
    }
    this.invalidate();
  }

  async getBuildCode(): Promise<string> {
    const code = this.imports?.getBuildCode();
    if (!code) {
      throw new Error("getBuildCode failed");
    }
    return code;
  }

  setLayerVisible(layer: number, sublayer: number, visible: boolean) {
    this.renderer?.setLayerVisible(layer, sublayer, visible);
    this.invalidate();
  }

  triggerSentryTestCrash() {
    this.imports?.sentryTestCrash();
  }

  private async tick() {
    this._frameScheduled = false;

    if (this.visible && this.dirtyCount > 0) {
      try {
        const start = performance.now();

        this.imports?.onFrame();

        const time = performance.now() - start;
        const stats = this.renderer?.getStats();
        this.hostCallbacks?.onFrame(start, time, stats);
        this.dirtyCount -= 1;
      } catch (error) {
        this.hostCallbacks?.onError(error);
        this.dirtyCount = 0;
        return;
      }
    }

    if (this.visible && this.dirtyCount > 0) {
      this.scheduleFrame();
    }
  }

  private resolveImports(module: DriverModule): Imports {
    return {
      init: module.cwrap("init", "number", []),
      start: module.cwrap("start", "number", []),
      loadBuildFromCode: module.cwrap("load_build_from_code", "number", ["string"]),
      getBuildCode: module.cwrap("get_build_code", "string", []),
      onFrame: module.cwrap("on_frame", "number", []),
      sentryTestCrash: module.cwrap("sentry_test_crash", null, []),
      onKeyUp: module.cwrap("on_key_up", "number", ["string", "number"]),
      onKeyDown: module.cwrap("on_key_down", "number", ["string", "number"]),
      onChar: module.cwrap("on_char", "number", ["string", "number"]),
      onDownloadPageResult: module.cwrap("on_download_page_result", "number", ["string"]),
      onSubScriptFinished: module.cwrap("on_subscript_finished", "number", ["number", "number"]),
      onSubScriptError: module.cwrap("on_subscript_error", "number", ["number", "string"]),
    };
  }

  private exports(module: DriverModule) {
    return {
      onError: (message: string) => this.hostCallbacks?.onError(new Error(`Error in lua: ${message}`)),
      setWindowTitle: (title: string) => this.hostCallbacks?.onTitleChange(title),
      getScreenWidth: () => this.screenSize.width,
      getScreenHeight: () => this.screenSize.height,
      getCursorPosX: () => this.mouseState.x,
      getCursorPosY: () => this.mouseState.y,
      isKeyDown: (name: string) => this.pressedKeys.has(name as PoBKey),
      imageLoad: (handle: number, filename: string, flags: number) => {
        this.imageRepo?.load(handle, filename, flags).then(() => {
          this.invalidate();
        });
      },
      drawCommit: (bufferPtr: number, size: number) => {
        this.renderer?.render(new DataView(module.HEAPU8.buffer, bufferPtr, size));
      },
      getStringWidth: (size: number, font: number, text: string) => this.textMetrics?.measure(size, font, text) ?? 0,
      getStringCursorIndex: (size: number, font: number, text: string, cursorX: number, cursorY: number) =>
        this.textMetrics?.measureCursorIndex(size, font, text, cursorX, cursorY) ?? 0,
      copy: (text: string) => this.mainCallbacks?.copy(text),
      openUrl: (url: string) => this.mainCallbacks?.openUrl(url),
    };
  }
}

const worker = new DriverWorker();
Comlink.expose(worker);
