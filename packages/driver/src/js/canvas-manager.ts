export interface CanvasConfig {
  minWidth: number;
  minHeight: number;
  toolbarSize: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasStyleSize {
  width: number;
  height: number;
}

export interface CanvasRenderingSize {
  styleWidth: number; // CSS size (without pixel ratio)
  styleHeight: number; // CSS size (without pixel ratio)
  renderingWidth: number; // Actual rendering resolution (with pixel ratio)
  renderingHeight: number; // Actual rendering resolution (with pixel ratio)
  pixelRatio: number;
}

export interface CanvasState {
  styleSize: CanvasStyleSize;
  containerSize: CanvasSize;
  needsPanning: boolean;
  isFixedSize: boolean;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private canvasContainer: HTMLDivElement | null = null;
  private root: HTMLElement | null = null;

  // Style size - controls CSS appearance of canvas in DOM
  private currentStyleWidth: number;
  private currentStyleHeight: number;
  private isFixedSize = false;

  private config: CanvasConfig;
  private resizeObserver: ResizeObserver | null = null;

  private onStateChange?: (state: CanvasState) => void;
  private onRenderingSizeChange?: (size: CanvasRenderingSize) => void;

  constructor(config: CanvasConfig) {
    this.config = config;
    this.currentStyleWidth = config.minWidth;
    this.currentStyleHeight = config.minHeight;
  }

  setCallbacks(callbacks: {
    onStateChange?: (state: CanvasState) => void;
    onRenderingSizeChange?: (size: CanvasRenderingSize) => void;
  }) {
    this.onStateChange = callbacks.onStateChange;
    this.onRenderingSizeChange = callbacks.onRenderingSizeChange;
  }

  createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.transformOrigin = "0 0";

    // Set initial style size (CSS visual appearance)
    canvas.style.width = `${this.currentStyleWidth}px`;
    canvas.style.height = `${this.currentStyleHeight}px`;

    // Set initial rendering resolution (canvas.width/height)
    // Note: After transferControlToOffscreen(), rendering resolution is managed by worker
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = this.currentStyleWidth * pixelRatio;
    canvas.height = this.currentStyleHeight * pixelRatio;

    this.canvas = canvas;
    return canvas;
  }

  createCanvasContainer(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    `;
    this.canvasContainer = container;
    return container;
  }

  attachToDOM(root: HTMLElement): { canvas: HTMLCanvasElement; container: HTMLDivElement } {
    this.root = root;

    // Create elements
    const canvas = this.createCanvas();
    const container = this.createCanvasContainer();

    // Initialize size based on root dimensions
    const rootRect = root.getBoundingClientRect();
    this.updateCanvasSize(rootRect.width, rootRect.height);

    // Setup container and canvas
    container.appendChild(canvas);

    // Setup resize observer
    this.setupResizeObserver();

    return { canvas, container };
  }

  detachFromDOM() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas = null;
    this.canvasContainer = null;
    this.root = null;
  }

  setCanvasStyleSize(width: number, height: number) {
    this.currentStyleWidth = width;
    this.currentStyleHeight = height;
    this.isFixedSize = true;

    if (this.canvasContainer) {
      const containerRect = this.canvasContainer.getBoundingClientRect();
      this.updateCanvasStyleSize();
      this.notifyStateChange(containerRect.width, containerRect.height);
      this.notifyRenderingSizeChange();
    }
  }

  adjustForToolbar(isPortrait: boolean) {
    if (!this.canvasContainer) return;

    const toolbarSize = this.config.toolbarSize;

    if (isPortrait) {
      // Portrait: toolbar at bottom
      this.canvasContainer.style.bottom = `${toolbarSize}px`;
      this.canvasContainer.style.right = "0";
    } else {
      // Landscape: toolbar at right
      this.canvasContainer.style.right = `${toolbarSize}px`;
      this.canvasContainer.style.bottom = "0";
    }
  }

  getCurrentState(): CanvasState {
    const containerRect = this.canvasContainer?.getBoundingClientRect();
    const containerSize = containerRect
      ? { width: containerRect.width, height: containerRect.height }
      : { width: 0, height: 0 };

    return {
      styleSize: { width: this.currentStyleWidth, height: this.currentStyleHeight },
      containerSize,
      needsPanning: this.currentStyleWidth > containerSize.width || this.currentStyleHeight > containerSize.height,
      isFixedSize: this.isFixedSize,
    };
  }

  getStyleSize(): CanvasStyleSize {
    return { width: this.currentStyleWidth, height: this.currentStyleHeight };
  }

  getRenderingSize(): CanvasRenderingSize {
    const pixelRatio = window.devicePixelRatio || 1;
    return {
      styleWidth: this.currentStyleWidth,
      styleHeight: this.currentStyleHeight,
      renderingWidth: this.currentStyleWidth * pixelRatio,
      renderingHeight: this.currentStyleHeight * pixelRatio,
      pixelRatio,
    };
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getCanvasContainer(): HTMLDivElement | null {
    return this.canvasContainer;
  }

  private calculateStyleSize(containerWidth: number, containerHeight: number): CanvasStyleSize {
    if (this.isFixedSize) {
      return {
        width: this.currentStyleWidth,
        height: this.currentStyleHeight,
      };
    } else {
      return {
        width: Math.max(containerWidth, this.config.minWidth),
        height: Math.max(containerHeight, this.config.minHeight),
      };
    }
  }

  private updateCanvasSize(containerWidth: number, containerHeight: number) {
    // Update style size if not fixed
    if (!this.isFixedSize) {
      const styleSize = this.calculateStyleSize(containerWidth, containerHeight);
      this.currentStyleWidth = styleSize.width;
      this.currentStyleHeight = styleSize.height;
    }

    // Update canvas style size (DOM appearance only)
    this.updateCanvasStyleSize();

    // Notify changes
    this.notifyStateChange(containerWidth, containerHeight);
    this.notifyRenderingSizeChange();
  }

  private updateCanvasStyleSize() {
    if (!this.canvas) return;

    // Update CSS size only (visual appearance)
    // Note: canvas.width/height (rendering resolution) is handled by worker after transferControlToOffscreen
    this.canvas.style.width = `${this.currentStyleWidth}px`;
    this.canvas.style.height = `${this.currentStyleHeight}px`;
  }

  private notifyStateChange(containerWidth: number, containerHeight: number) {
    if (!this.onStateChange) return;

    const state: CanvasState = {
      styleSize: { width: this.currentStyleWidth, height: this.currentStyleHeight },
      containerSize: { width: containerWidth, height: containerHeight },
      needsPanning: this.currentStyleWidth > containerWidth || this.currentStyleHeight > containerHeight,
      isFixedSize: this.isFixedSize,
    };

    this.onStateChange(state);
  }

  private notifyRenderingSizeChange() {
    if (!this.onRenderingSizeChange) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const renderingSize: CanvasRenderingSize = {
      styleWidth: this.currentStyleWidth,
      styleHeight: this.currentStyleHeight,
      renderingWidth: this.currentStyleWidth * pixelRatio,
      renderingHeight: this.currentStyleHeight * pixelRatio,
      pixelRatio,
    };

    this.onRenderingSizeChange(renderingSize);
  }

  private setupResizeObserver() {
    if (!this.canvasContainer) return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.updateCanvasSize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    this.resizeObserver.observe(this.canvasContainer);
  }
}
