import * as Comlink from "comlink";

import { type CanvasConfig, CanvasManager, type CanvasRenderingSize, type CanvasState } from "./canvas-manager";
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
  private touchTransformManager: TouchTransformManager | undefined;
  private overlayManager: ReactOverlayManager | undefined;
  private canvasManager: CanvasManager | undefined;
  private panModeEnabled = false;
  private orientationChangeHandler: (() => void) | undefined;
  private windowResizeHandler: (() => void) | undefined;
  private isHandlingLayoutChange = false;

  // Minimum canvas size for PoB to render correctly
  private readonly MIN_CANVAS_WIDTH = 1550;
  private readonly MIN_CANVAS_HEIGHT = 800;
  private readonly TOOLBAR_SIZE = 60;

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
    this.driverWorker?.destroy();
    this.worker?.terminate();
  }

  attachToDOM(root: HTMLElement, useWebGPU = false) {
    if (this.root) throw new Error("Already attached");
    this.root = root;

    for (const child of [...this.root.children]) {
      this.root.removeChild(child);
    }

    // Initialize CanvasManager
    const canvasConfig: CanvasConfig = {
      minWidth: this.MIN_CANVAS_WIDTH,
      minHeight: this.MIN_CANVAS_HEIGHT,
      toolbarSize: this.TOOLBAR_SIZE,
    };

    this.canvasManager = new CanvasManager(canvasConfig);

    // Set up callbacks for CanvasManager
    this.canvasManager.setCallbacks({
      onStateChange: (state: CanvasState) => {
        // Update pan mode based on canvas state
        if (state.needsPanning && !this.panModeEnabled) {
          this.panModeEnabled = true;
          this.uiEventManager?.setPanMode(true);
          this.overlayManager?.updateState({ panModeEnabled: true });
        } else if (!state.needsPanning && this.panModeEnabled) {
          this.panModeEnabled = false;
          this.uiEventManager?.setPanMode(false);
          this.overlayManager?.updateState({ panModeEnabled: false });
          this.touchTransformManager?.reset();
          this.updateTransform();
        }

        // Update TouchTransformManager with style size and container sizes
        this.touchTransformManager?.updateCanvasSize(state.styleSize.width, state.styleSize.height);
        this.touchTransformManager?.updateContainerSize(state.containerSize.width, state.containerSize.height);

        // Update overlay with current style size
        this.overlayManager?.updateState({
          currentCanvasSize: state.styleSize,
        });
      },
      onRenderingSizeChange: (renderingSize: CanvasRenderingSize) => {
        // Notify worker of rendering size change
        // Pass style size and pixel ratio separately to worker
        this.driverWorker?.resize({
          width: renderingSize.styleWidth,
          height: renderingSize.styleHeight,
          pixelRatio: renderingSize.pixelRatio,
        });
      },
    });

    // Attach canvas manager to DOM
    const { canvas, container } = this.canvasManager.attachToDOM(root);

    // Transfer canvas control to worker
    const offscreenCanvas = canvas.transferControlToOffscreen();
    this.driverWorker?.setCanvas(Comlink.transfer(offscreenCanvas, [offscreenCanvas]), useWebGPU);

    // Initialize touch transform manager
    const r = root.getBoundingClientRect();
    const initialState = this.canvasManager.getCurrentState();
    this.touchTransformManager = new TouchTransformManager(
      initialState.styleSize.width,
      initialState.styleSize.height,
      r.width,
      r.height,
    );

    // Set initial pan mode if needed
    if (initialState.needsPanning) {
      this.panModeEnabled = true;
    }

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
      onZoomChange: (zoom: number) => {
        this.zoomTo(zoom);
      },
      onCanvasSizeChange: (width: number, height: number) => {
        this.canvasManager?.setCanvasStyleSize(width, height);
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
    root.appendChild(container);
    root.appendChild(overlayContainer);
    root.tabIndex = 0;
    root.focus();

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    // Setup orientation and resize handlers
    this.setupOrientationAndResizeHandlers();

    // Initial layout adjustment for canvas to avoid toolbar overlap
    this.adjustCanvasForOverlay();

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

    // Set initial pan mode state
    this.uiEventManager.setPanMode(this.panModeEnabled);
    this.driverWorker?.handleVisibilityChange(root.ownerDocument.visibilityState === "visible");

    // Initialize overlay manager after uiEventManager is created
    this.overlayManager = new ReactOverlayManager(overlayContainer);
    const currentState = this.canvasManager.getCurrentState();
    this.overlayManager.render({
      callbacks: toolbarCallbacks,
      keyboardState: this.uiEventManager.keyboardState,
      panModeEnabled: this.panModeEnabled,
      currentZoom: this.touchTransformManager?.transform.scale ?? 1.0,
      currentCanvasSize: currentState.styleSize,
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
    this.uiEventManager?.destroy();
    this.canvasManager = undefined;
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
    const canvas = this.canvasManager?.getCanvas();
    if (!canvas || !this.touchTransformManager) {
      return;
    }

    canvas.style.transform = this.touchTransformManager.generateTransformCSS();

    // Update overlay with current zoom level and canvas size
    this.overlayManager?.updateState({
      currentZoom: this.touchTransformManager.transform.scale,
      currentCanvasSize: this.touchTransformManager.canvasSize,
    });
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

  setCanvasSize(width: number, height: number) {
    this.canvasManager?.setCanvasStyleSize(width, height);

    // Reset transform to prevent invalid positions after size change
    this.touchTransformManager?.reset();
    this.updateTransform();
  }

  private adjustCanvasForOverlay() {
    if (!this.canvasManager) {
      return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;

    this.canvasManager.adjustForToolbar(isPortrait);
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
