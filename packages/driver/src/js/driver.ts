import * as Comlink from "comlink";

import { UIEventManager } from "./event";
import type { DriverWorker, HostCallbacks } from "./worker";
import WorkerObject from "./worker?worker";

export type FilesystemConfig = {
  userDirectory: string;
  cloudflareKvPrefix: string;
  cloudflareKvAccessToken: string | undefined;
  cloudflareKvUserNamespace: string | undefined;
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

  async start(fileSystemConfig: FilesystemConfig) {
    if (this.isStarted) throw new Error("Already started");
    this.isStarted = true;

    this.worker = new WorkerObject();
    this.driverWorker = Comlink.wrap<DriverWorker>(this.worker);

    return this.driverWorker.start(
      this.build,
      this.assetPrefix,
      fileSystemConfig,
      Comlink.proxy(this.hostCallbacks.onError),
      Comlink.proxy(this.hostCallbacks.onFrame),
      Comlink.proxy(this.hostCallbacks.onFetch),
      Comlink.proxy(this.hostCallbacks.onTitleChange),
      Comlink.proxy((text: string) => this.copy(text)),
      Comlink.proxy(() => this.paste()),
      Comlink.proxy(url => {
        window.open(url, "_blank");
      }),
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

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const pixelRatio = document.defaultView?.devicePixelRatio ?? 1;
        const { width, height } = entry.contentRect;
        this.driverWorker?.resize({ width, height, pixelRatio });
      }
    });
    this.resizeObserver.observe(root);

    this.uiEventManager = new UIEventManager(root, {
      onMouseMove: uiState => this.driverWorker?.handleMouseMove(uiState),
      onKeyDown: (name, doubleClick, uiState) => this.driverWorker?.handleKeyDown(name, doubleClick, uiState),
      onKeyUp: (name, doubleClick, uiState) => this.driverWorker?.handleKeyUp(name, doubleClick, uiState),
      onChar: (char, doubleClick, uiState) => this.driverWorker?.handleChar(char, doubleClick, uiState),
      onVisibilityChange: visible => this.driverWorker?.handleVisibilityChange(visible),
    });
    this.driverWorker?.handleVisibilityChange(root.ownerDocument.visibilityState === "visible");
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

  async loadBuildFromCode(code: string) {
    return this.driverWorker?.loadBuildFromCode(code);
  }
}
