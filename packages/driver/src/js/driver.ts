import * as Comlink from "comlink";
import type { SettingsRootElement } from "pob-game";

// @ts-types="./vite-worker.d.ts"
import BrokerWorkerObject from "./broker.ts?worker";
import { type CanvasConfig, CanvasManager, type CanvasRenderingSize, type CanvasState } from "./canvas-manager.ts";
import { type ClipboardAction, ClipboardController, type ClipboardShortcut } from "./clipboard.ts";
import { assertDriverCapabilities } from "./capability.ts";
import type { DriverDiagnostic } from "./diagnostic.ts";
import { EventHandler } from "./event.ts";
import { toggleFullscreen } from "./fullscreen.ts";
import { DOMKeyboardState, KeyboardHandler, type PoBKey, PoBKeyboardState } from "./keyboard.ts";
import { MouseHandler, type MouseState } from "./mouse-handler.ts";
import { type FrameData, ReactOverlayManager, type RenderStats, type ToolbarCallbacks } from "./overlay/index.ts";
import type { ToolbarPosition as ToolbarPos } from "./overlay/types.ts";
import { BackgroundPromiseOwner, enqueueOwnedAction } from "./promise-owner.ts";
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
    oauthAuthorizeCallback: HostCallbacks["onOAuthAuthorize"],
    pasteCallback: () => Promise<string>,
  ): Promise<void>;
};

type AsyncDriverWorker = Comlink.Remote<DriverWorker> & {
  handleClipboardAction(action: ClipboardAction): Promise<void>;
};

export type FilesystemConfig = {
  userDirectory: string;
  settingsRootElement: SettingsRootElement;
  cloudflareKvPrefix: string;
  cloudflareKvAccessToken: string | undefined;
  cloudflareKvUserNamespace: string | undefined;
};

export type DriverLifecycleCallbacks = {
  onWorkerCreated?: (worker: Worker) => void;
  onKeyboardStateChange?: (keys: readonly PoBKey[]) => void;
  onDiagnostic?: (diagnostic: DriverDiagnostic) => void;
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
  private pendingClipboardAction: Promise<void> = Promise.resolve();
  private readonly backgroundPromises: BackgroundPromiseOwner;

  private diagnostic(
    phase: DriverDiagnostic["phase"],
    event: string,
    data?: Record<string, unknown>,
    level: DriverDiagnostic["level"] = "info",
  ) {
    this.lifecycleCallbacks.onDiagnostic?.({ phase, event, data, level });
  }

  private observeWorker(worker: Worker, kind: "main" | "broker") {
    this.diagnostic("worker", "created", { kind });
    worker.addEventListener("error", (event) => {
      this.diagnostic("worker", "error", { kind, message: event.message }, "error");
    });
    worker.addEventListener("messageerror", () => {
      this.diagnostic("worker", "messageerror", { kind }, "error");
    });
  }

  private readonly MIN_CANVAS_WIDTH = 1550;
  private readonly MIN_CANVAS_HEIGHT = 800;
  private readonly TOOLBAR_SIZE = 60;

  constructor(
    readonly build: "debug" | "release",
    readonly assetPrefix: string,
    readonly hostCallbacks: HostCallbacks,
    readonly lifecycleCallbacks: DriverLifecycleCallbacks = {},
  ) {
    this.backgroundPromises = new BackgroundPromiseOwner(
      (operation, error) => {
        this.diagnostic("worker", "rpc-error", { operation, errorName: errorName(error) }, "error");
      },
      (error) => this.hostCallbacks.onError(error),
    );
    this.diagnostic("driver", "construct", { build });
    const originalOnFrame = this.hostCallbacks.onFrame;
    this.hostCallbacks.onFrame = (at: number, time: number, stats?: RenderStats) => {
      this.pushFrame(at, time, stats);
      originalOnFrame(at, time, stats);
    };
  }

  async start(fileSystemConfig: FilesystemConfig) {
    if (this.isStarted) throw new Error("Already started");
    assertDriverCapabilities();
    this.isStarted = true;
    this.diagnostic("driver", "start");

    try {
      const brokerWorker = new BrokerWorkerObject();
      this.brokerWorker = brokerWorker;
      this.observeWorker(brokerWorker, "broker");
      this.broker = Comlink.wrap<AsyncBroker>(brokerWorker);
      const channel = new MessageChannel();
      const eventChannel = new MessageChannel();
      await this.broker.start(
        Comlink.transfer(channel.port1, [channel.port1]),
        Comlink.transfer(eventChannel.port1, [eventChannel.port1]),
        this.assetPrefix,
        fileSystemConfig,
        Comlink.proxy(this.hostCallbacks.onFetch),
        Comlink.proxy(this.hostCallbacks.onOAuthAuthorize),
        Comlink.proxy(() => this.paste()),
      );

      const worker = new WorkerObject();
      this.worker = worker;
      this.observeWorker(worker, "main");
      this.lifecycleCallbacks.onWorkerCreated?.(worker);
      this.driverWorker = Comlink.wrap<DriverWorker>(worker) as AsyncDriverWorker;

      return await this.driverWorker.start(
        this.build,
        this.assetPrefix,
        Comlink.transfer(channel.port2, [channel.port2]),
        Comlink.transfer(eventChannel.port2, [eventChannel.port2]),
        Comlink.proxy(this.hostCallbacks.onError),
        Comlink.proxy(this.hostCallbacks.onFrame),
        Comlink.proxy(this.hostCallbacks.onOAuthLogout),
        Comlink.proxy(this.hostCallbacks.onTitleChange),
        Comlink.proxy((diagnostic: DriverDiagnostic) => this.lifecycleCallbacks.onDiagnostic?.(diagnostic)),
        Comlink.proxy((text: string) => this.copy(text)),
        Comlink.proxy((url) => {
          window.open(url, "_blank");
        }),
      );
    } catch (error) {
      this.diagnostic("driver", "start-error", { error: String(error) }, "error");
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
    this.diagnostic("driver", "destroy");
    this.worker?.terminate();
    this.brokerWorker?.terminate();
  }

  private dispatchWorker(operation: string, invoke: () => Promise<unknown> | undefined): void {
    this.backgroundPromises.dispatch(operation, invoke);
  }

  async attachToDOM(root: HTMLElement): Promise<void> {
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
    this.diagnostic("canvas", "manager-created");

    this.canvasManager.setCallbacks({
      onStateChange: (state: CanvasState) => {
        this.overlayManager?.updateState({
          currentCanvasSize: state.styleSize,
          isFixedSize: state.isFixedSize,
        });
      },
      onRenderingSizeChange: (renderingSize: CanvasRenderingSize) => {
        this.diagnostic("canvas", "resize", { ...renderingSize });
        this.dispatchWorker("resize", () =>
          this.driverWorker?.resize({
            width: renderingSize.renderingWidth,
            height: renderingSize.renderingHeight,
            pixelRatio: renderingSize.pixelRatio,
          }));
      },
    });

    const { canvas, container } = this.canvasManager.attachToDOM(root);
    root.style.position = "relative";
    root.appendChild(container);

    const offscreenCanvas = canvas.transferControlToOffscreen();
    await this.driverWorker?.setCanvas(Comlink.transfer(offscreenCanvas, [offscreenCanvas]));
    const renderingSize = this.canvasManager.getRenderingSize();
    await this.driverWorker?.resize({
      width: renderingSize.renderingWidth,
      height: renderingSize.renderingHeight,
      pixelRatio: renderingSize.pixelRatio,
    });

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
        this.dispatchWorker("keyboard-state", () => this.driverWorker?.updateKeyboardState(state.pobKeys));
        this.dispatchWorker("key-down", () => this.driverWorker?.handleKeyDown(key, doubleClick));
        if (doubleClick > 0) this.dispatchWorker("key-up", () => this.driverWorker?.handleKeyUp(key, 0));
      },
      onKeyUp: (state: PoBKeyboardState, key: PoBKey) => {
        this.lifecycleCallbacks.onKeyboardStateChange?.([...state.pobKeys]);
        this.dispatchWorker("keyboard-state", () => this.driverWorker?.updateKeyboardState(state.pobKeys));
        this.dispatchWorker("key-up", () => this.driverWorker?.handleKeyUp(key, 0));
      },
      onChar: (state: PoBKeyboardState, key: string) => {
        this.dispatchWorker("keyboard-state", () => this.driverWorker?.updateKeyboardState(state.pobKeys));
        this.dispatchWorker("character", () => this.driverWorker?.handleChar(key, 0));
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
        onMouseStateUpdate: (mouseState) => {
          const transformedMouse = this.transformMouseCoordinates(mouseState);
          this.dispatchWorker("mouse-move", () => this.driverWorker?.handleMouseMove(transformedMouse));
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
        this.dispatchWorker("visibility", () => this.driverWorker?.handleVisibilityChange(visible));
      },
      onCopy: () => this.dispatchClipboardAction({ type: "copy" }),
      onPaste: (text) => this.dispatchClipboardAction({ type: "paste", text }),
    });

    this.mouseHandler!.setPanMode(this.panModeEnabled);
    this.dispatchWorker(
      "visibility",
      () => this.driverWorker?.handleVisibilityChange(root.ownerDocument.visibilityState === "visible"),
    );

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
    this.enqueueClipboardAction(async () => {
      await this.driverWorker?.handleClipboardAction(action);
    });
  }

  private handleVirtualClipboardShortcut(shortcut: ClipboardShortcut) {
    this.enqueueClipboardAction(async () => {
      if (shortcut === "copy") {
        await this.driverWorker?.handleClipboardAction({ type: "copy" });
        return;
      }
      const text = await this.clipboard.readText();
      if (text !== undefined) await this.driverWorker?.handleClipboardAction({ type: "paste", text });
    });
  }

  private enqueueClipboardAction(action: () => Promise<void>) {
    this.pendingClipboardAction = enqueueOwnedAction(this.pendingClipboardAction, action, (error) => {
      this.diagnostic("worker", "rpc-error", { operation: "clipboard", errorName: errorName(error) }, "error");
    });
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

  async flushInput(): Promise<void> {
    await this.pendingClipboardAction;
    await this.driverWorker?.flushInput();
  }

  setLayerVisible(layer: number, sublayer: number, visible: boolean) {
    this.dispatchWorker("layer-visible", () => this.driverWorker?.setLayerVisible(layer, sublayer, visible));
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
    await toggleFullscreen(this.root);
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

function errorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "Error";
}
