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
  styleWidth: number;
  styleHeight: number;
  renderingWidth: number;
  renderingHeight: number;
  pixelRatio: number;
}

export interface ViewportTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CanvasState {
  styleSize: CanvasStyleSize;
  containerSize: CanvasSize;
  isFixedSize: boolean;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private canvasContainer: HTMLDivElement | null = null;
  private root: HTMLElement | null = null;

  private currentStyleWidth: number;
  private currentStyleHeight: number;
  private isFixedSize = false;

  private config: CanvasConfig;
  private resizeObserver: ResizeObserver | null = null;

  private _scale = 1;
  private _panTranslateX = 0;
  private _panTranslateY = 0;
  private _zoomTranslateX = 0;
  private _zoomTranslateY = 0;
  private _minScale = 0.1;
  private _maxScale = 2.0;
  private _containerWidth = 800;
  private _containerHeight = 600;
  private _isInitialScale = true;
  private _initialScale = 1;

  private onStateChange?: (state: CanvasState) => void;
  private onRenderingSizeChange?: (size: CanvasRenderingSize) => void;

  constructor(config: CanvasConfig) {
    this.config = config;
    this.currentStyleWidth = config.minWidth;
    this.currentStyleHeight = config.minHeight;
    this._containerWidth = config.minWidth;
    this._containerHeight = config.minHeight;
    this._initialScale = 1;
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

    canvas.style.width = `${this.currentStyleWidth}px`;
    canvas.style.height = `${this.currentStyleHeight}px`;

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

    const canvas = this.createCanvas();
    const container = this.createCanvasContainer();

    const rootRect = root.getBoundingClientRect();
    this.updateCanvasSize(rootRect.width, rootRect.height);

    container.appendChild(canvas);

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

      this._constrainTransform();
      this._updateCanvasTransform();

      this.notifyStateChange(containerRect.width, containerRect.height);
      this.notifyRenderingSizeChange();
    }
  }

  resetToAutoSize() {
    this.isFixedSize = false;

    if (this.canvasContainer) {
      const containerRect = this.canvasContainer.getBoundingClientRect();
      this.updateCanvasSize(containerRect.width, containerRect.height);
    }
  }

  adjustForToolbar(isPortrait: boolean) {
    if (!this.canvasContainer) return;

    const toolbarSize = this.config.toolbarSize;

    if (isPortrait) {
      this.canvasContainer.style.bottom = `${toolbarSize}px`;
      this.canvasContainer.style.right = "0";
      this._containerHeight = Math.max(0, this._containerHeight - toolbarSize);
    } else {
      this.canvasContainer.style.right = `${toolbarSize}px`;
      this.canvasContainer.style.bottom = "0";
      this._containerWidth = Math.max(0, this._containerWidth - toolbarSize);
    }

    if (this._isInitialScale && !this.isFixedSize) {
      this.calculateInitialScale();
      this._isInitialScale = false;
    }

    this._constrainTransform();
    this._updateCanvasTransform();
  }

  recalculateInitialScale() {
    this.calculateInitialScale();
    this._scale = this._initialScale;
    this._zoomTranslateX = 0;
    this._zoomTranslateY = 0;
    this._constrainTransform();
    this._updateCanvasTransform();
  }

  getCurrentState(): CanvasState {
    const containerRect = this.canvasContainer?.getBoundingClientRect();
    const containerSize = containerRect
      ? { width: containerRect.width, height: containerRect.height }
      : { width: 0, height: 0 };

    return {
      styleSize: { width: this.currentStyleWidth, height: this.currentStyleHeight },
      containerSize,
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

  get transform(): ViewportTransform {
    return {
      scale: this._scale,
      translateX: this._panTranslateX + this._zoomTranslateX, // Combined translation for external use
      translateY: this._panTranslateY + this._zoomTranslateY,
    };
  }

  zoom(scale: number, centerX: number, centerY: number) {
    const newScale = Math.max(this._minScale, Math.min(this._maxScale, this._scale * scale));
    const scaleChange = newScale / this._scale;

    const oldTotalTranslateX = this._panTranslateX + this._zoomTranslateX;
    const oldTotalTranslateY = this._panTranslateY + this._zoomTranslateY;

    const newTotalTranslateX = centerX - (centerX - oldTotalTranslateX) * scaleChange;
    const newTotalTranslateY = centerY - (centerY - oldTotalTranslateY) * scaleChange;

    this._zoomTranslateX = newTotalTranslateX - this._panTranslateX;
    this._zoomTranslateY = newTotalTranslateY - this._panTranslateY;
    this._scale = newScale;

    this._constrainTransform();
    this._updateCanvasTransform();
  }

  pan(deltaX: number, deltaY: number) {
    this._panTranslateX += deltaX;
    this._panTranslateY += deltaY;
    this._constrainTransform();
    this._updateCanvasTransform();
  }

  resetPan() {
    this._panTranslateX = 0;
    this._panTranslateY = 0;
    this._constrainTransform();
    this._updateCanvasTransform();
  }

  resetZoom() {
    this._scale = this._initialScale;
    this._zoomTranslateX = 0;
    this._zoomTranslateY = 0;
    this._isInitialScale = false;
    this._constrainTransform();
    this._updateCanvasTransform();
  }

  resetTransform() {
    this._scale = 1;
    this._panTranslateX = 0;
    this._panTranslateY = 0;
    this._zoomTranslateX = 0;
    this._zoomTranslateY = 0;
    this._isInitialScale = false;
    this._constrainTransform();
    this._updateCanvasTransform();
  }

  zoomTo(scale: number, centerX?: number, centerY?: number) {
    const cx = centerX ?? this._containerWidth / 2;
    const cy = centerY ?? this._containerHeight / 2;

    this.resetZoom();
    this.zoom(scale, cx, cy);
    this._isInitialScale = false;
  }

  screenToCanvas(containerX: number, containerY: number): { x: number; y: number } {
    const totalTranslateX = this._panTranslateX + this._zoomTranslateX;
    const totalTranslateY = this._panTranslateY + this._zoomTranslateY;

    const result = {
      x: (containerX - totalTranslateX) / this._scale, // Complete inverse of applied CSS transform
      y: (containerY - totalTranslateY) / this._scale, // Both pan and zoom translation considered
    };

    return result;
  }

  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const totalTranslateX = this._panTranslateX + this._zoomTranslateX;
    const totalTranslateY = this._panTranslateY + this._zoomTranslateY;
    return {
      x: canvasX * this._scale + totalTranslateX,
      y: canvasY * this._scale + totalTranslateY,
    };
  }

  generateTransformCSS(): string {
    const totalTranslateX = this._panTranslateX + this._zoomTranslateX;
    const totalTranslateY = this._panTranslateY + this._zoomTranslateY;
    return `translate(${totalTranslateX}px, ${totalTranslateY}px) scale(${this._scale})`;
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
    this._containerWidth = containerWidth;
    this._containerHeight = containerHeight;

    if (!this.isFixedSize) {
      const styleSize = this.calculateStyleSize(containerWidth, containerHeight);
      this.currentStyleWidth = styleSize.width;
      this.currentStyleHeight = styleSize.height;
    }

    this.updateCanvasStyleSize();

    this._constrainTransform();
    this._updateCanvasTransform();

    this.notifyStateChange(containerWidth, containerHeight);
    this.notifyRenderingSizeChange();
  }

  private calculateInitialScale() {
    const widthFits = this.currentStyleWidth <= this._containerWidth;
    const heightFits = this.currentStyleHeight <= this._containerHeight;

    if (!widthFits || !heightFits) {
      const scaleToFitWidth = this._containerWidth / this.currentStyleWidth;
      const scaleToFitHeight = this._containerHeight / this.currentStyleHeight;

      const initialScale = Math.max(scaleToFitWidth, scaleToFitHeight);

      this._initialScale = Math.max(this._minScale, Math.min(this._maxScale, initialScale));
      this._scale = this._initialScale;
    } else {
      this._initialScale = 1;
    }
  }

  private updateCanvasStyleSize() {
    if (!this.canvas) return;

    this.canvas.style.width = `${this.currentStyleWidth}px`;
    this.canvas.style.height = `${this.currentStyleHeight}px`;
  }

  private notifyStateChange(containerWidth: number, containerHeight: number) {
    if (!this.onStateChange) return;

    const state: CanvasState = {
      styleSize: { width: this.currentStyleWidth, height: this.currentStyleHeight },
      containerSize: { width: containerWidth, height: containerHeight },
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

  private _constrainTransform() {
    const scaledWidth = this.currentStyleWidth * this._scale;
    const scaledHeight = this.currentStyleHeight * this._scale;

    const totalTranslateX = this._panTranslateX + this._zoomTranslateX;
    const totalTranslateY = this._panTranslateY + this._zoomTranslateY;

    let newTotalTranslateX = totalTranslateX;
    let newTotalTranslateY = totalTranslateY;

    if (scaledWidth <= this._containerWidth) {
      newTotalTranslateX = Math.round((this._containerWidth - scaledWidth) / 2);
    } else {
      const maxTranslateX = 0;
      const minTranslateX = this._containerWidth - scaledWidth;
      newTotalTranslateX = Math.max(minTranslateX, Math.min(maxTranslateX, totalTranslateX));
    }

    if (scaledHeight <= this._containerHeight) {
      newTotalTranslateY = Math.round((this._containerHeight - scaledHeight) / 2);
    } else {
      const maxTranslateY = 0;
      const minTranslateY = this._containerHeight - scaledHeight;
      newTotalTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, totalTranslateY));
    }

    this._panTranslateX = newTotalTranslateX - this._zoomTranslateX;
    this._panTranslateY = newTotalTranslateY - this._zoomTranslateY;
  }

  private _updateCanvasTransform() {
    if (!this.canvas) return;
    this.canvas.style.transform = this.generateTransformCSS();
  }
}
