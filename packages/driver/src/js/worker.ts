import * as zenfs from "@zenfs/core";
import { Zip } from "@zenfs/zip";
import * as Comlink from "comlink";
// @ts-ignore
import { default as Module } from "../../dist/driver.mjs";
import { NodeEmscriptenFS, SimpleAsyncFS, SimpleAsyncStore } from "./fs";
import { ImageRepository } from "./image";
import type { FilesystemConfig } from "./main.ts";
import { Renderer, TextRasterizer, WebGL1Backend } from "./renderer";

type Mod = {
  HEAPU8: Uint8Array;
};

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
  getUIState: () => Promise<{ x: number; y: number; keys: Set<string> }>;
  copy: (text: string) => void;
  paste: () => Promise<string>;
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
  private textRasterizer: TextRasterizer | undefined;
  private renderer: Renderer | undefined;
  private screenSize: { width: number; height: number } = {
    width: 800,
    height: 600,
  };
  private uiState: { x: number; y: number; keys: Set<string> } = {
    x: 0,
    y: 0,
    keys: new Set(),
  };
  private hostCallbacks: HostCallbacks | undefined;
  private mainCallbacks: MainCallbacks | undefined;
  private imports: Imports | undefined;
  private isDirty = false;
  private isRunning = true;

  async start(
    assetPrefix: string,
    fileSystemConfig: FilesystemConfig,
    getCallback: (key: string) => Promise<Uint8Array | undefined>,
    putCallback: (key: string, data: Uint8Array, overwrite: boolean) => Promise<boolean>,
    removeCallback: (key: string) => Promise<void>,
    onError: HostCallbacks["onError"],
    onFrame: HostCallbacks["onFrame"],
    onFetch: HostCallbacks["onFetch"],
    getUIState: MainCallbacks["getUIState"],
    copy: MainCallbacks["copy"],
    paste: MainCallbacks["paste"],
  ) {
    this.imageRepo = new ImageRepository(`${assetPrefix}/root/`);

    await TextRasterizer.loadFonts();
    this.textRasterizer = new TextRasterizer(this.invalidate);

    this.renderer = new Renderer(this.imageRepo, this.textRasterizer, this.screenSize);
    this.hostCallbacks = {
      onError,
      onFrame,
      onFetch,
    };
    this.mainCallbacks = {
      getUIState,
      copy,
      paste,
    };

    const module = await Module({
      print: console.log,
      printErr: console.warn,
    });

    const rootZip = await fetch(`${assetPrefix}/root.zip`);
    const rootFs = await zenfs.resolveMountConfig({
      backend: Zip,
      zipData: await rootZip.arrayBuffer(),
      name: "root.zip",
    });

    const localStore = new SimpleAsyncStore(getCallback, putCallback, removeCallback);
    const localFs = await zenfs.resolveMountConfig({
      name: "LocalStorage",
      backend: SimpleAsyncFS,
      store: localStore,
    });

    await zenfs.configure({
      mounts: {
        "/root": rootFs,
        "/user": localFs,
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

    module.FS.mkdir("/app");
    module.FS.mount(new NodeEmscriptenFS(module.FS, module.PATH, module.ERRNO_CODES, zenfs.fs), { root: "." }, "/app");

    Object.assign(module, this.exports(module));
    this.imports = this.resolveImports(module);

    this.imports?.init();
    this.imports?.start();

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
    this.isDirty = true;
  }

  handleKeyDown(name: string, doubleClick: number) {
    this.imports?.onKeyDown(name, doubleClick);
  }

  handleKeyUp(name: string, doubleClick: number) {
    this.imports?.onKeyUp(name, doubleClick);
  }

  handleChar(char: string, doubleClick: number) {
    this.imports?.onChar(char, doubleClick);
  }

  private tick() {
    const start = performance.now();

    this.mainCallbacks?.getUIState().then((state) => {
      this.uiState = state;
      this.imports?.onFrame();

      const time = performance.now() - start;
      this.hostCallbacks?.onFrame(this.isDirty, time);
      this.isDirty = false;
      if (this.isRunning) requestAnimationFrame(this.tick.bind(this));
    });
  }

  // js -> wasm
  private resolveImports(module: any): Imports {
    return {
      init: module.cwrap("init", "number", []),
      start: module.cwrap("start", "number", []),
      onFrame: module.cwrap("on_frame", "number", []),
      onKeyUp: module.cwrap("on_key_up", "number", ["string", "number"]),
      onKeyDown: module.cwrap("on_key_down", "number", ["string", "number"]),
      onChar: module.cwrap("on_char", "number", ["string", "number"]),
      onDownloadPageResult: module.cwrap("on_download_page_result", "number", ["string"]),
    };
  }

  // wasm -> js
  private exports(module: Mod) {
    return {
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
        if (this.isDirty) {
          this.renderer?.render(new DataView(module.HEAPU8.buffer, bufferPtr, size));
        }
      },
      getStringWidth: (size: number, font: number, text: string) =>
        this.textRasterizer?.measureText(size, font, text) ?? 0,
      getStringCursorIndex: (size: number, font: number, text: string, cursorX: number, cursorY: number) =>
        this.textRasterizer?.measureTextCursorIndex(size, font, text, cursorX, cursorY) ?? 0,
      copy: (text: string) => this.mainCallbacks?.copy(text),
      paste: () => this.mainCallbacks?.paste(),
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
