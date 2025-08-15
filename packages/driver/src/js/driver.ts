import * as Comlink from "comlink";

import { UIEventManager, type UIState } from "./event";
import { ReactOverlayManager, type ToolbarCallbacks, type ToolbarPosition } from "./overlay";
import { TouchTransformManager } from "./touch";
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
  private canvas: HTMLCanvasElement | undefined;
  private touchTransformManager: TouchTransformManager | undefined;
  private overlayManager: ReactOverlayManager | undefined;
  private canvasContainer: HTMLDivElement | undefined;
  private panModeEnabled = false;
  private orientationChangeHandler: (() => void) | undefined;
  private windowResizeHandler: (() => void) | undefined;
  private isHandlingLayoutChange = false;

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

  attachToDOM(root: HTMLElement, useWebGPU = false) {
    if (this.root) throw new Error("Already attached");
    this.root = root;

    for (const child of [...this.root.children]) {
      this.root.removeChild(child);
    }

    const r = root.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const pixelRatio = window.devicePixelRatio || 1;
    // Canvas resolution (高DPI対応)
    canvas.width = r.width * pixelRatio;
    canvas.height = r.height * pixelRatio;
    // CSS サイズ
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    canvas.style.position = "absolute";
    canvas.style.transformOrigin = "0 0";
    this.canvas = canvas;

    const offscreenCanvas = canvas.transferControlToOffscreen();
    this.driverWorker?.setCanvas(Comlink.transfer(offscreenCanvas, [offscreenCanvas]), useWebGPU);

    // Initialize touch transform manager
    this.touchTransformManager = new TouchTransformManager(canvas.width, canvas.height, r.width, r.height);

    // Create canvas container - positioned to avoid toolbar overlap
    this.canvasContainer = document.createElement("div");
    this.canvasContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    `;

    // Create overlay container - 100% size, in front of canvas
    const overlayContainer = document.createElement("div");
    overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;

    // Toolbar container will be managed by React

    // Initialize toolbar
    const toolbarCallbacks: ToolbarCallbacks = {
      onChar: (char, doubleClick, uiState) => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleChar(char, doubleClick, transformedState);
      },
      onKeyDown: (key, doubleClick, uiState) => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleKeyDown(key, doubleClick, transformedState);
      },
      onKeyUp: (key, doubleClick, uiState) => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleKeyUp(key, doubleClick, transformedState);
      },
      onZoomReset: () => {
        this.resetTransform();
      },
      onLayoutChange: () => {
        // Toolbar layout changes no longer affect canvas layout
      },
      onFullscreenToggle: () => {
        this.toggleFullscreen();
      },
      onPanModeToggle: (enabled: boolean) => {
        this.panModeEnabled = enabled;
        this.uiEventManager?.setPanMode(enabled);
      },
      onKeyboardToggle: () => {
        // Keyboard toggle is handled by React state in OverlayContainer
      },
    };

    root.style.position = "relative";
    this.canvasContainer.appendChild(canvas);
    root.appendChild(this.canvasContainer);
    root.appendChild(overlayContainer);
    root.tabIndex = 0;
    root.focus();

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    // Setup orientation and resize handlers
    this.setupOrientationAndResizeHandlers();

    // Initial layout adjustment for canvas to avoid toolbar overlap
    this.adjustCanvasForOverlay();

    // Ensure initial resize is sent to worker
    const initialRect = this.canvasContainer.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      this.updateCanvasSize(initialRect.width, initialRect.height);
    }

    this.resizeObserver = new ResizeObserver(entries => {
      // Avoid duplicate handling when orientation change is in progress
      if (this.isHandlingLayoutChange) {
        return;
      }

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Canvas container サイズ変更を直接検出してcanvasサイズを更新
        this.updateCanvasSize(width, height);
        // TouchTransformManagerも更新
        this.touchTransformManager?.updateContainerSize(width, height);
        this.touchTransformManager?.updateCanvasSize(width, height);
        this.updateTransform();
      }
    });
    this.resizeObserver.observe(this.canvasContainer);

    this.uiEventManager = new UIEventManager(root, {
      onMouseMove: uiState => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleMouseMove(transformedState);
      },
      onKeyDown: (name, doubleClick, uiState) => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleKeyDown(name, doubleClick, transformedState);
      },
      onKeyUp: (name, doubleClick, uiState) => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleKeyUp(name, doubleClick, transformedState);
      },
      onChar: (char, doubleClick, uiState) => {
        const transformedState = this.transformUIState(uiState);
        this.driverWorker?.handleChar(char, doubleClick, transformedState);
      },
      onVisibilityChange: visible => this.driverWorker?.handleVisibilityChange(visible),
      onZoom: (scale, centerX, centerY) => {
        this.touchTransformManager?.zoom(scale, centerX, centerY);
        this.updateTransform();
      },
      onPan: (deltaX, deltaY) => {
        this.touchTransformManager?.pan(deltaX, deltaY);
        this.updateTransform();
      },
    });
    this.driverWorker?.handleVisibilityChange(root.ownerDocument.visibilityState === "visible");

    // Initialize overlay manager after uiEventManager is created
    this.overlayManager = new ReactOverlayManager(overlayContainer);
    this.overlayManager.render({
      callbacks: toolbarCallbacks,
      keyboardState: this.uiEventManager.keyboardState,
    });
  }

  detachFromDOM() {
    this.resizeObserver?.disconnect();
    this.overlayManager?.destroy();
    document.removeEventListener("fullscreenchange", () => this.handleFullscreenChange());
    this.cleanupOrientationAndResizeHandlers();
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

  setLayerVisible(layer: number, sublayer: number, visible: boolean) {
    return this.driverWorker?.setLayerVisible(layer, sublayer, visible);
  }

  private transformUIState(uiState: UIState): UIState {
    if (!this.touchTransformManager) {
      return {
        x: uiState.x,
        y: uiState.y,
        keys: this.uiEventManager?.keyboardState.pobKeys ?? uiState.keys,
      };
    }

    // Transform screen coordinates to canvas coordinates
    const canvasCoords = this.touchTransformManager.screenToCanvas(uiState.x, uiState.y);

    return {
      x: canvasCoords.x,
      y: canvasCoords.y,
      keys: this.uiEventManager?.keyboardState.pobKeys ?? uiState.keys,
    };
  }

  private updateTransform() {
    if (!this.canvas || !this.touchTransformManager) {
      return;
    }

    this.canvas.style.transform = this.touchTransformManager.generateTransformCSS();
  }

  // Public methods for external control
  resetTransform() {
    this.touchTransformManager?.reset();
    this.updateTransform();
  }

  zoomTo(scale: number, centerX?: number, centerY?: number) {
    if (!this.touchTransformManager || !this.root) return;

    const rect = this.root.getBoundingClientRect();
    const cx = centerX ?? rect.width / 2;
    const cy = centerY ?? rect.height / 2;

    // Reset first, then zoom to desired scale
    this.touchTransformManager.reset();
    this.touchTransformManager.zoom(scale, cx, cy);
    this.updateTransform();
  }

  getTouchTransformManager(): TouchTransformManager | undefined {
    return this.touchTransformManager;
  }

  private adjustCanvasForOverlay() {
    if (!this.canvasContainer || !this.root) {
      return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;

    // Toolbar size constants
    const toolbarSize = 60; // 44px button + 16px padding

    if (isPortrait) {
      // Portrait: toolbar at bottom
      this.canvasContainer.style.bottom = `${toolbarSize}px`;
      this.canvasContainer.style.right = "0";
    } else {
      // Landscape: toolbar at right
      this.canvasContainer.style.right = `${toolbarSize}px`;
      this.canvasContainer.style.bottom = "0";
    }

    // Update canvas size based on new container dimensions
    const rect = this.canvasContainer.getBoundingClientRect();
    this.updateCanvasSize(rect.width, rect.height);
    this.touchTransformManager?.updateContainerSize(rect.width, rect.height);
    this.touchTransformManager?.updateCanvasSize(rect.width, rect.height);
    this.updateTransform();
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

      // Check if we're currently in fullscreen
      const isFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isFullscreen) {
        // Enter fullscreen - try various vendor-prefixed methods
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          // iOS Safari uses webkitRequestFullscreen
          elem.webkitRequestFullscreen();
        } else if (elem.webkitEnterFullscreen) {
          // Some mobile browsers use this
          elem.webkitEnterFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        } else {
          console.warn("Fullscreen API not supported on this device");
        }
      } else {
        // Exit fullscreen - try various vendor-prefixed methods
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

  private updateCanvasSize(width: number, height: number) {
    if (this.canvas) {
      // CSS サイズのみ更新 (offscreenCanvas転送後はwidth/heightは変更しない)
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    // PoB worker に新しいサイズを通知 (workerが実際のcanvas resolutionを管理)
    const pixelRatio = window.devicePixelRatio || 1;
    this.driverWorker?.resize({ width, height, pixelRatio });
  }

  private handleFullscreenChange() {
    // Force layout recalculation after fullscreen change
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

    // Use requestAnimationFrame to ensure browser layout calculations are complete
    requestAnimationFrame(() => {
      // Adjust canvas for overlay after orientation change
      this.adjustCanvasForOverlay();

      // Reset flag after layout is complete
      this.isHandlingLayoutChange = false;
    });
  }

  // Toolbar layout is now managed by React components
}
