import * as Comlink from "comlink";

import * as zenfs from "@zenfs/core";
import { UIEventManager } from "./event.ts";
import type { DriverWorker, HostCallbacks } from "./worker.ts";
import WorkerObject from "./worker.ts?worker";

export type FilesystemConfig = {
  cloudflareKvPrefix: string;
  cloudflareKvAccessToken: string | undefined;
};

export class Driver {
  private isStarted = false;
  private uiEventManager: UIEventManager | undefined;
  private root: HTMLElement | undefined;
  private worker: Worker | undefined;
  private driverWorker: Comlink.Remote<DriverWorker> | undefined;
  private resizeObserver: ResizeObserver | undefined;

  constructor(
    readonly build: "debug" | "release",
    readonly assetPrefix: string,
    readonly hostCallbacks: HostCallbacks,
  ) {}

  start(fileSystemConfig: FilesystemConfig) {
    if (this.isStarted) throw new Error("Already started");
    this.isStarted = true;

    this.worker = new WorkerObject();
    this.driverWorker = Comlink.wrap<DriverWorker>(this.worker);
    return this.driverWorker.start(
      this.build,
      this.assetPrefix,
      fileSystemConfig,
      Comlink.proxy(async (key: string) => {
        const data = localStorage.getItem(key);
        if (data !== null) {
          return zenfs.encode(data);
        }
      }),
      Comlink.proxy(async (key: string, data: Uint8Array, overwrite: boolean) => {
        try {
          if (overwrite || localStorage.getItem(key) === null) {
            localStorage.setItem(key, zenfs.decode(data));
            return true;
          }
          return false;
        } catch (e) {
          throw new zenfs.ErrnoError(zenfs.Errno.ENOSPC, "Storage is full.");
        }
      }),
      Comlink.proxy(async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          throw new zenfs.ErrnoError(zenfs.Errno.EIO, `Unable to delete key ${key}: ${e}`);
        }
      }),
      Comlink.proxy(this.hostCallbacks.onError),
      Comlink.proxy(this.hostCallbacks.onFrame),
      Comlink.proxy(this.hostCallbacks.onFetch),
      Comlink.proxy((text: string) => this.copy(text)),
      Comlink.proxy(() => this.paste()),
      Comlink.proxy((url) => window.open(url, "_black")),
    );
  }

  destory() {
    console.log("destroy");
    this.driverWorker?.destroy();
    this.worker?.terminate();
  }

  attachToDOM(root: HTMLElement) {
    if (this.root) throw new Error("Already attached");
    this.root = root;

    for (const child of [...this.root.children]) {
      this.root.removeChild(child);
    }

    const r = root.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = r.width;
    canvas.height = r.height;
    canvas.style.position = "absolute";

    const offscreenCanvas = canvas.transferControlToOffscreen();
    this.driverWorker?.setCanvas(Comlink.transfer(offscreenCanvas, [offscreenCanvas]));

    root.style.position = "relative";
    root.appendChild(canvas);
    root.tabIndex = 0;
    root.focus();

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.driverWorker?.resize({ width, height });
      }
    });
    this.resizeObserver.observe(root);

    this.uiEventManager = new UIEventManager(root, {
      onMouseMove: (uiState) => this.driverWorker?.handleMouseMove(uiState),
      onKeyDown: (name, doubleClick, uiState) => this.driverWorker?.handleKeyDown(name, doubleClick, uiState),
      onKeyUp: (name, doubleClick, uiState) => this.driverWorker?.handleKeyUp(name, doubleClick, uiState),
      onChar: (char, doubleClick, uiState) => this.driverWorker?.handleChar(char, doubleClick, uiState),
    });
  }

  detachFromDOM() {
    this.resizeObserver?.disconnect();
    if (this.root) {
      for (const child of [...this.root.children]) {
        this.root.removeChild(child);
      }
    }
    this.uiEventManager?.destroy();
  }

  copy(text: string) {
    return navigator.clipboard.writeText(text);
  }

  async paste() {
    const data = await navigator.clipboard.read();
    for (const item of data) {
      if (item.types.includes("text/plain")) {
        const data = await item.getType("text/plain");
        return await data.text();
      }
    }
    return "";
  }
}
