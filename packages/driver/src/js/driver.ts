import * as Comlink from "comlink";

// @ts-types="./vite-worker.d.ts"
import BrokerWorkerObject from "./broker.ts?worker";
import { type CanvasConfig, CanvasManager, type CanvasRenderingSize, type CanvasState } from "./canvas-manager.ts";
import { type ClipboardAction, ClipboardController, type ClipboardShortcut } from "./clipboard.ts";
import { markEnvironmentError } from "./error.ts";
import { EventHandler } from "./event.ts";
import { DOMKeyboardState, KeyboardHandler, type PoBKey, PoBKeyboardState } from "./keyboard.ts";
import { MouseHandler, type MouseState } from "./mouse-handler.ts";
import { type FrameData, ReactOverlayManager, type RenderStats, type ToolbarCallbacks } from "./overlay/index.ts";
import type { ToolbarPosition as ToolbarPos } from "./overlay/types.ts";
import type { DriverWorker, HostCallbacks } from "./worker.ts";
// @ts-types="./vite-worker.d.ts"
import WorkerObject from "./worker.ts?worker";

type AsyncBroker = {
  start(
    port: MessagePort,
    eventPort: MessagePort,
    assetPrefix: string,
    config: FilesystemConfig,
    fetchCallback: HostCallbacks["onFetch"],
    pasteCallback: () => Promise<string>,
  ): Promise<void>;
};

type AsyncDriverWorker = Comlink.Remote<DriverWorker> & {
  handleClipboardAction(action: ClipboardAction): Promise<void>;
};

export type FilesystemConfig = {
  userDirectory: string;
  cloudflareKvPrefix: string;
  cloudflareKvAccessToken: string | undefined;
  cloudflareKvUserNamespace: string | undefined;
};

export type DriverLifecycleCallbacks = {
  onWorkerCreated?: (worker: Worker) => void;
  onKeyboardStateChange?: (keys: readonly PoBKey[]) => void;
};

export class Driver {
  private isStarted = false;
  private eventHandler: EventHandler | undefined;
  private mouseHandler: MouseHandler | undefined;
  private pobKeyboardState: PoBKeyboardState | undefined;
  private domKeyboardState: DOMKeyboardState | undefined;
  private keyboardHandler: KeyboardHandler | undefined;
  private root: HTMLElement | undefined;
  private worker: Worker | undefined;
  private brokerWorker: Worker | undefined;
  private broker: Comlink.Remote<AsyncBroker> | undefined;
  private driverWorker: AsyncDriverWorker | undefined;
  private overlayManager: ReactOverlayManager | undefined;
  private canvasManager: CanvasManager | undefined;
  private panModeEnabled = false;
  private orientationChangeHandler: (() => void) | undefined;
  private windowResizeHandler: (() => void) | undefined;
  private isHandlingLayoutChange = false;
  private performanceVisible = false;
  private frames: FrameData[] = [];
  private renderStats: RenderStats | null = null;
  private externalComponent: React.ComponentType<{ position: ToolbarPos; isLandscape: boolean }> | undefined;
  private clipboard = new ClipboardController(navigator.clipboard);

  private readonly MIN_CANVAS_WIDTH = 1550;
  private readonly MIN_CANVAS_HEIGHT = 800;
  private readonly TOOLBAR_SIZE = 60;

  constructor(
    readonly build: "debug" | "release",
    readonly assetPrefix: string,
    readonly hostCallbacks: HostCallbacks,
    readonly lifecycleCallbacks: DriverLifecycleCallbacks = {},
  ) {
    const originalOnFrame = this.hostCallbacks.onFrame;
    this.hostCallbacks.onFrame = (at: number, time: number, stats?: RenderStats) => {
      this.pushFrame(at, time, stats);
      originalOnFrame(at, time, stats);
    };
  }

  async start(fileSystemConfig: FilesystemConfig) {
    if (this.isStarted) throw new Error("Already started");
    if (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer !== "function") {
      throw markEnvironmentError(
        new Error("Path of Building requires cross-origin isolation and SharedArrayBuffer support"),
        "capability",
      );
    }
    this.isStarted = true;

    try {
      const brokerWorker = new BrokerWorkerObject();
      this.brokerWorker = brokerWorker;
      this.broker = Comlink.wrap<AsyncBroker>(brokerWorker);
      const channel = new MessageChannel();
      const eventChannel = new MessageChannel();
      await this.broker.start(
        Comlink.transfer(channel.port1, [channel.port1]),
        Comlink.transfer(eventChannel.port1, [eventChannel.port1]),
        this.assetPrefix,
        fileSystemConfig,
        Comlink.proxy(this.hostCallbacks.onFetch),
        Comlink.proxy(() => this.paste()),
      );

      const worker = new WorkerObject();
      this.worker = worker;
      this.lifecycleCallbacks.onWorkerCreated?.(worker);
      this.driverWorker = Comlink.wrap<DriverWorker>(worker) as AsyncDriverWorker;

      return await this.driverWorker.start(
        this.build,
        this.assetPrefix,
        Comlink.transfer(channel.port2, [channel.port2]),
        Comlink.transfer(eventChannel.port2, [eventChannel.port2]),
        Comlink.proxy(this.hostCallbacks.onError),
        Comlink.proxy(this.hostCallbacks.onFrame),
        Comlink.proxy(this.hostCallbacks.onTitleChange),
        Comlink.proxy((text: string) => this.copy(text)),
        Comlink.proxy((url) => {
          window.open(url, "_blank");
        }),
      );
    } catch (error) {
      this.worker?.terminate();
      this.brokerWorker?.terminate();
      this.worker = undefined;
      this.brokerWorker = undefined;
      this.driverWorker = undefined;
      this.broker = undefined;
      this.isStarted = false;
      throw error;
    }
  }

  destory() {
    this.driverWorker?.destroy();
    this.worker?.terminate();
    this.brokerWorker?.terminate();
  }

  async attachToDOM(root: HTMLElement, useWebGPU = false): Promise<void> {
    if (this.root) throw new Error("Already attached");
    this.root = root;

    for (const child of [...this.root.children]) {
      this.root.removeChild(child);
    }

    const canvasConfig: CanvasConfig = {
      minWidth: this.MIN_CANVAS_WIDTH,
      minHeight: this.MIN_CANVAS_HEIGHT,
      toolbarSize: this.TOOLBAR_SIZE,
    };

    this.canvasManager = new CanvasManager(canvasConfig);

    this.canvasManager.setCallbacks({
      onStateChange: (state: CanvasState) => {
        this.overlayManager?.updateState({
          currentCanvasSize: state.styleSize,
          isFixedSize: state.isFixedSize,
        });
      },
      onRenderingSizeChange: (renderingSize: CanvasRenderingSize) => {
        this.driverWorker?.resize({
          width: renderingSize.styleWidth,
          height: renderingSize.styleHeight,
          pixelRatio: renderingSize.pixelRatio,
        });
      },
    });

    const { canvas, container } = this.canvasManager.attachToDOM(root);
    root.style.position = "relative";
    root.appendChild(container);

    const offscreenCanvas = canvas.transferControlToOffscreen();
    await this.driverWorker?.setCanvas(Comlink.transfer(offscreenCanvas, [offscreenCanvas]), useWebGPU);

    const overlayContainer = document.createElement("div");
    overlayContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;

    root.appendChild(overlayContainer);

    container.tabIndex = 0;
    container.contentEditable = "true";
    container.inputMode = "none";
    container.spellcheck = false;
    container.focus();
    container.style.outline = "none";
    container.style.caretColor = "transparent";

    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    this.setupOrientationAndResizeHandlers();

    this.adjustCanvasForOverlay();

    this.pobKeyboardState = PoBKeyboardState.make({
      onKeyDown: (state: PoBKeyboardState, key: PoBKey, doubleClick: number) => {
        this.lifecycleCallbacks.onKeyboardStateChange?.([...state.pobKeys]);
        this.driverWorker?.updateKeyboardState(state.pobKeys);
        this.driverWorker?.handleKeyDown(key, doubleClick);
        if (doubleClick > 0) this.driverWorker?.handleKeyUp(key, 0);
      },
      onKeyUp: (state: PoBKeyboardState, key: PoBKey) => {
        this.lifecycleCallbacks.onKeyboardStateChange?.([...state.pobKeys]);
        this.driverWorker?.updateKeyboardState(state.pobKeys);
        this.driverWorker?.handleKeyUp(key, 0);
      },
      onChar: (state: PoBKeyboardState, key: string) => {
        this.driverWorker?.updateKeyboardState(state.pobKeys);
        this.driverWorker?.handleChar(key, 0);
      },
    });
    this.domKeyboardState = DOMKeyboardState.make(this.pobKeyboardState);
    this.keyboardHandler = KeyboardHandler.make(
      container,
      this.domKeyboardState,
      () => this.dispatchClipboardAction({ type: "copy" }),
    );

    this.mouseHandler = new MouseHandler(
      container,
      {
        onMouseMove: () => {
          const transformedMouse = this.transformMouseCoordinates(this.mouseHandler!.mouseState);
          this.driverWorker?.handleMouseMove(transformedMouse);
        },
        onMouseStateUpdate: (mouseState) => {
          const transformedMouse = this.transformMouseCoordinates(mouseState);
          this.driverWorker?.handleMouseMove(transformedMouse);
        },
        onZoom: (scale, centerX, centerY) => {
          this.canvasManager?.zoom(scale, centerX, centerY);
          this.updateOverlayWithTransform();
        },
        onPan: (deltaX, deltaY) => {
          this.canvasManager?.pan(deltaX, deltaY);
          this.updateOverlayWithTransform();
        },
      },
      this.pobKeyboardState,
    );

    this.eventHandler = new EventHandler(container, {
      onVisibilityChange: (visible) => {
        if (!visible) {
          this.domKeyboardState?.releasePhysicalKeys();
        }
        this.driverWorker?.handleVisibilityChange(visible);
      },
      onCopy: () => this.dispatchClipboardAction({ type: "copy" }),
      onPaste: (text) => this.dispatchClipboardAction({ type: "paste", text }),
    });

    this.mouseHandler!.setPanMode(this.panModeEnabled);
    this.driverWorker?.handleVisibilityChange(root.ownerDocument.visibilityState === "visible");

    const toolbarCallbacks: ToolbarCallbacks = {
      onZoomReset: () => {
        this.canvasManager?.resetZoom();
        this.updateOverlayWithTransform();
      },
      onZoomChange: (zoom: number) => {
        this.zoomTo(zoom);
      },
      onCanvasSizeChange: (width: number, height: number) => {
        this.canvasManager?.setCanvasStyleSize(width, height);
      },
      onFixedSizeToggle: (isFixed: boolean) => {
        if (isFixed) {
          const currentSize = this.canvasManager?.getStyleSize();
          if (currentSize) {
            this.canvasManager?.setCanvasStyleSize(currentSize.width, currentSize.height);
          }
        } else {
          this.canvasManager?.resetToAutoSize();
        }
        this.updateOverlayWithTransform();
      },
      onLayoutChange: () => {},
      onFullscreenToggle: () => {
        this.toggleFullscreen();
      },
      onPanModeToggle: (enabled: boolean) => {
        this.panModeEnabled = enabled;
        this.mouseHandler!.setPanMode(enabled);
      },
      onKeyboardToggle: () => {},
      onPerformanceToggle: () => {
        this.performanceVisible = !this.performanceVisible;
        this.updateOverlayWithTransform();
      },
      onClipboardShortcut: (shortcut) => this.handleVirtualClipboardShortcut(shortcut),
    };

    this.overlayManager = new ReactOverlayManager(overlayContainer);
    const currentState = this.canvasManager.getCurrentState();
    this.overlayManager.render({
      callbacks: toolbarCallbacks,
      keyboardState: this.domKeyboardState,
      panModeEnabled: this.panModeEnabled,
      currentZoom: this.canvasManager?.transform.scale ?? 1.0,
      currentCanvasSize: currentState.styleSize,
      frames: this.frames,
      renderStats: this.renderStats,
      performanceVisible: this.performanceVisible,
      externalComponent: this.externalComponent,
      onLayerVisibilityChange: (layer: number, sublayer: number, visible: boolean) => {
        this.setLayerVisible(layer, sublayer, visible);
      },
    });
  }

  detachFromDOM() {
    this.canvasManager?.detachFromDOM();
    this.overlayManager?.destroy();
    document.removeEventListener("fullscreenchange", () => this.handleFullscreenChange());
    this.cleanupOrientationAndResizeHandlers();
    if (this.root) {
      for (const child of [...this.root.children]) {
        this.root.removeChild(child);
      }
    }
    this.eventHandler?.destroy();
    this.mouseHandler?.destroy();
    this.keyboardHandler?.destroy();
    this.canvasManager = undefined;
  }

  copy(text: string) {
    void this.clipboard.writeText(text);
  }

  async paste() {
    return (await this.clipboard.readText()) ?? "";
  }

  private dispatchClipboardAction(action: ClipboardAction) {
    void this.driverWorker?.handleClipboardAction(action);
  }

  private async handleVirtualClipboardShortcut(shortcut: ClipboardShortcut) {
    if (shortcut === "copy") {
      this.dispatchClipboardAction({ type: "copy" });
      return;
    }
    const text = await this.clipboard.readText();
    if (text !== undefined) this.dispatchClipboardAction({ type: "paste", text });
  }

  async loadBuildFromCode(code: string) {
    return this.driverWorker?.loadBuildFromCode(code);
  }

  async getBuildCode(): Promise<string> {
    const code = await this.driverWorker?.getBuildCode();
    if (!code) {
      throw new Error("getBuildCode failed");
    }
    return code;
  }

  setLayerVisible(layer: number, sublayer: number, visible: boolean) {
    return this.driverWorker?.setLayerVisible(layer, sublayer, visible);
  }

  triggerSentryTestCrash() {
    return this.driverWorker?.triggerSentryTestCrash();
  }

  pushFrame(at: number, renderTime: number, stats?: RenderStats) {
    this.frames = [...this.frames, { at, renderTime }].slice(-60); // Keep last 60 frames
    if (stats) {
      this.renderStats = stats;
    }
    if (this.performanceVisible) {
      this.updateOverlayWithTransform();
    }
  }

  setExternalToolbarComponent(
    component: React.ComponentType<{ position: ToolbarPos; isLandscape: boolean }> | undefined,
  ) {
    this.externalComponent = component;
    this.updateOverlayWithTransform();
  }

  private transformMouseCoordinates(mouseState: MouseState): MouseState {
    if (!this.canvasManager) {
      return mouseState;
    }

    const canvasCoords = this.canvasManager.screenToCanvas(mouseState.x, mouseState.y);
    return {
      x: canvasCoords.x,
      y: canvasCoords.y,
    };
  }

  private updateOverlayWithTransform() {
    if (!this.canvasManager) {
      return;
    }

    const canvasState = this.canvasManager.getCurrentState();
    this.overlayManager?.updateState({
      currentZoom: this.canvasManager.transform.scale,
      currentCanvasSize: this.canvasManager.getStyleSize(),
      isFixedSize: canvasState.isFixedSize,
      frames: this.frames,
      renderStats: this.renderStats,
      performanceVisible: this.performanceVisible,
      externalComponent: this.externalComponent,
    });
  }

  resetTransform() {
    this.canvasManager?.resetTransform();
    this.updateOverlayWithTransform();
  }

  zoomTo(scale: number, centerX?: number, centerY?: number) {
    if (!this.canvasManager) return;

    this.canvasManager.zoomTo(scale, centerX, centerY);
    this.updateOverlayWithTransform();
  }

  setCanvasSize(width: number, height: number) {
    this.canvasManager?.setCanvasStyleSize(width, height);

    this.canvasManager?.resetTransform();
    this.updateOverlayWithTransform();
  }

  private adjustCanvasForOverlay() {
    if (!this.canvasManager) {
      return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;

    this.canvasManager.adjustForToolbar(isPortrait);
    this.updateOverlayWithTransform();
  }

  private async toggleFullscreen() {
    if (!this.root) return;

    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
        webkitExitFullscreen?: () => void;
        webkitCancelFullScreen?: () => void;
        mozCancelFullScreen?: () => void;
        msExitFullscreen?: () => void;
      };
      const elem = this.root as HTMLElement & {
        webkitRequestFullscreen?: () => void;
        webkitEnterFullscreen?: () => void;
        mozRequestFullScreen?: () => void;
        msRequestFullscreen?: () => void;
      };

      const isFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isFullscreen) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.webkitEnterFullscreen) {
          elem.webkitEnterFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        } else {
          console.warn("Fullscreen API not supported on this device");
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.webkitCancelFullScreen) {
          doc.webkitCancelFullScreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (error) {
      console.warn("Fullscreen toggle failed:", error);
    }
  }

  private handleFullscreenChange() {
    if (this.overlayManager) {
      this.handleLayoutChange();
    }
  }

  private setupOrientationAndResizeHandlers() {
    this.orientationChangeHandler = () => {
      this.handleLayoutChange();
    };

    this.windowResizeHandler = () => {
      this.handleLayoutChange();
    };

    window.addEventListener("orientationchange", this.orientationChangeHandler);
    window.addEventListener("resize", this.windowResizeHandler);
  }

  private cleanupOrientationAndResizeHandlers() {
    if (this.orientationChangeHandler) {
      window.removeEventListener("orientationchange", this.orientationChangeHandler);
      this.orientationChangeHandler = undefined;
    }
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
      this.windowResizeHandler = undefined;
    }
  }

  private handleLayoutChange() {
    if (this.isHandlingLayoutChange) {
      return;
    }

    this.isHandlingLayoutChange = true;

    requestAnimationFrame(() => {
      this.adjustCanvasForOverlay();

      this.canvasManager?.recalculateInitialScale();

      this.updateOverlayWithTransform();

      this.isHandlingLayoutChange = false;
    });
  }

  setPerformanceVisible(visible: boolean) {
    this.performanceVisible = visible;
    this.updateOverlayWithTransform();
  }
}
