import * as Comlink from "comlink";

import { UIEventManager, type UIState } from "./event";
import { ResponsiveToolbar, type ToolbarCallbacks } from "./toolbar";
import { ModifierKeyManager, TouchTransformManager } from "./touch";
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
  private modifierKeyManager: ModifierKeyManager | undefined;
  private toolbar: ResponsiveToolbar | undefined;
  private canvasContainer: HTMLDivElement | undefined;
  private dragModeEnabled = false;

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

    // Initialize modifier key manager
    this.modifierKeyManager = new ModifierKeyManager(modifiers => {
      // Update UI state when modifiers change
      this.updateTransform();
    });

    // Create canvas container
    this.canvasContainer = document.createElement("div");
    this.canvasContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    `;

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
      onLayoutChange: toolbarBounds => {
        this.adjustCanvasLayout(toolbarBounds);
      },
      onFullscreenToggle: () => {
        this.toggleFullscreen();
      },
      onDragModeToggle: (enabled: boolean) => {
        this.dragModeEnabled = enabled;
        this.uiEventManager?.setDragMode(enabled);
      },
    };

    this.toolbar = new ResponsiveToolbar(root, this.modifierKeyManager, toolbarCallbacks);

    root.style.position = "relative";
    this.canvasContainer.appendChild(canvas);
    root.appendChild(this.canvasContainer);
    root.tabIndex = 0;
    root.focus();

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());

    // Initial layout adjustment
    this.adjustCanvasLayout(this.toolbar.getToolbarBounds());

    // Ensure initial resize is sent to worker
    const initialRect = this.canvasContainer.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      this.updateCanvasSize(initialRect.width, initialRect.height);
    }

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Canvas container サイズ変更を直接検出してcanvasサイズを更新
        this.updateCanvasSize(width, height);
        // TouchTransformManagerも更新
        this.touchTransformManager?.updateContainerSize(width, height);
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
  }

  detachFromDOM() {
    this.resizeObserver?.disconnect();
    this.toolbar?.destroy();
    document.removeEventListener("fullscreenchange", () => this.handleFullscreenChange());
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
    if (!this.touchTransformManager || !this.modifierKeyManager) {
      return uiState;
    }

    // Transform screen coordinates to canvas coordinates
    const canvasCoords = this.touchTransformManager.screenToCanvas(uiState.x, uiState.y);

    // Combine modifier keys with existing keys
    const modifierKeys = this.modifierKeyManager.generateKeyState();
    const combinedKeys = new Set([...uiState.keys, ...modifierKeys]);

    return {
      x: canvasCoords.x,
      y: canvasCoords.y,
      keys: combinedKeys,
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

  getModifierKeyManager(): ModifierKeyManager | undefined {
    return this.modifierKeyManager;
  }

  getTouchTransformManager(): TouchTransformManager | undefined {
    return this.touchTransformManager;
  }

  private adjustCanvasLayout(toolbarBounds: DOMRect) {
    if (!this.canvasContainer || !this.root) {
      return;
    }

    const rootRect = this.root.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;

    // Calculate available space based on toolbar position
    const top = 0;
    const left = 0;
    let right = 0;
    let bottom = 0;

    if (isPortrait) {
      // Toolbar is at bottom
      bottom = Math.max(0, toolbarBounds.height + 8); // 8px padding
    } else {
      // Toolbar is at right
      right = Math.max(0, toolbarBounds.width + 8); // 8px padding
    }

    // Apply the layout adjustments
    this.canvasContainer.style.top = `${top}px`;
    this.canvasContainer.style.left = `${left}px`;
    this.canvasContainer.style.right = `${right}px`;
    this.canvasContainer.style.bottom = `${bottom}px`;

    // Update touch transform manager with new container size
    const newWidth = rootRect.width - left - right;
    const newHeight = rootRect.height - top - bottom;

    this.touchTransformManager?.updateContainerSize(newWidth, newHeight);
    this.updateTransform();

    // Update canvas size to match the actual available area
    this.updateCanvasSize(newWidth, newHeight);
  }

  private async toggleFullscreen() {
    if (!this.root) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await this.root.requestFullscreen();
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
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
    if (this.toolbar) {
      // Add a small delay to ensure the browser has updated dimensions
      setTimeout(() => {
        this.adjustCanvasLayout(this.toolbar!.getToolbarBounds());
      }, 100);
    }
  }
}
