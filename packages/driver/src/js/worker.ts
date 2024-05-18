import * as zenfs from "@zenfs/core";
import { Zip } from "@zenfs/zip";
import * as Comlink from "comlink";
import type { FilesystemConfig } from "./driver.ts";
import type { UIState } from "./event.ts";
import { ImageRepository } from "./image";
// @ts-ignore
import { createNODEFS } from "./nodefs.js";
import {
  BinPackingTextRasterizer,
  Renderer,
  TextMetrics,
  type TextRasterizer,
  WebGL1Backend,
  loadFonts,
} from "./renderer";

interface DriverModule extends EmscriptenModule {
  FS: typeof FS;
  PATH: object;
  ERRNO_CODES: object;
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
    // const rootFs = await zenfs.resolveMountConfig({
    //   backend: Zip,
    //   zipData: await rootZip.arrayBuffer(),
    //   name: "root.zip",
    // } as any);

    // const userFs = await zenfs.resolveMountConfig({
    //   name: "LocalStorage",
    //   backend: zenfs.Port,
    //   port: self as unknown as any,
    // });

    await zenfs.configure({
      mounts: {
        "/root": {
          backend: Zip,
          zipData: await rootZip.arrayBuffer(),
          name: "root.zip",
        } as any,
        "/user": {
          name: "LocalStorage",
          backend: zenfs.Port,
          port: self as unknown as any,
        } as any,
      },
    });

    if (fileSystemConfig.cloudflareKvAccessToken) {
      // const headers = {
      // 	Authorization: `Bearer ${fileSystemConfig.cloudflareKvAccessToken}`,
      // };
      // const cloudStore = new SimpleAsyncStore(
      // 	async (key: string) => {
      // 		const r = await fetch(
      // 			`${fileSystemConfig.cloudflareKvPrefix}${key}`,
      // 			{
      // 				method: "GET",
      // 				headers,
      // 			},
      // 		);
      // 		if (r.ok) {
      // 			const blob = await r.blob();
      // 			const buf = await blob.arrayBuffer();
      // 			return new Uint8Array(buf);
      // 		}
      // 	},
      // 	async (key: string, data: Uint8Array, overwrite: boolean) => {
      // 		const r = await fetch(
      // 			`${fileSystemConfig.cloudflareKvPrefix}${key}?overwrite=${overwrite}`,
      // 			{
      // 				method: "PUT",
      // 				body: data,
      // 				headers,
      // 			},
      // 		);
      // 		return r.status === 204;
      // 	},
      // 	async (key: string) => {
      // 		await fetch(`${fileSystemConfig.cloudflareKvPrefix}${key}`, {
      // 			method: "DELETE",
      // 			headers,
      // 		});
      // 	},
      // );
      // const cloudFs = await zenfs.resolveMountConfig({
      // 	name: "Cloud",
      // 	backend: SimpleAsyncFS,
      // 	store: cloudStore,
      // 	lruCacheSize: 1000,
      // });
      // if (!zenfs.existsSync("/user/Path of Building/Builds/Cloud"))
      // 	zenfs.mkdirSync("/user/Path of Building/Builds/Cloud");
      // zenfs.mount("/user/Path of Building/Builds/Cloud", cloudFs);
    }

    // const nodeFS = createNODEFS(zenfs.fs, module.FS, module.PATH, module.ERRNO_CODES);

    // module.FS.mkdir("/app");
    // module.FS.mount(nodeFS, { root: "." }, "/app");

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
      fetch: async (url: string, header: string | undefined, body: string | undefined) => {
        try {
          const headers = header
            ? header
                .split("\n")
                .map((_) => _.split(":"))
                .reduce((acc, [k, v]) => ({ ...acc, [k.trim()]: v.trim() }), {})
            : {};
          const r = await this.hostCallbacks?.onFetch(url, headers, body);
          const headerText = Object.entries(r?.headers ?? {})
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          this.imports?.onDownloadPageResult(
            JSON.stringify({
              body: r?.body,
              status: r?.status,
              header: headerText,
              error: r?.error,
            }),
          );
        } catch (e: unknown) {
          console.error(e);
          this.imports?.onDownloadPageResult(
            JSON.stringify({
              body: undefined,
              status: undefined,
              header: undefined,
              error: e,
            }),
          );
        }
      },
    };
  }
}

const worker = new DriverWorker();
Comlink.expose(worker);
