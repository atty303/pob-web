export interface TouchTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export class TouchTransformManager {
  private _scale = 1;
  private _translateX = 0;
  private _translateY = 0;
  private _minScale = 0.5;
  private _maxScale = 3.0;
  private _canvasWidth = 800;
  private _canvasHeight = 600;
  private _containerWidth = 800;
  private _containerHeight = 600;

  constructor(canvasWidth: number, canvasHeight: number, containerWidth: number, containerHeight: number) {
    this._canvasWidth = canvasWidth;
    this._canvasHeight = canvasHeight;
    this._containerWidth = containerWidth;
    this._containerHeight = containerHeight;
  }

  get transform(): TouchTransform {
    return {
      scale: this._scale,
      translateX: this._translateX,
      translateY: this._translateY,
    };
  }

  get canvasSize(): { width: number; height: number } {
    return {
      width: this._canvasWidth,
      height: this._canvasHeight,
    };
  }

  updateContainerSize(width: number, height: number) {
    this._containerWidth = width;
    this._containerHeight = height;
    this._constrainTransform();
  }

  updateCanvasSize(width: number, height: number) {
    this._canvasWidth = width;
    this._canvasHeight = height;
    this._constrainTransform();
  }

  zoom(scale: number, centerX: number, centerY: number) {
    const newScale = Math.max(this._minScale, Math.min(this._maxScale, this._scale * scale));
    const scaleChange = newScale / this._scale;

    // Adjust translation to zoom around the center point
    this._translateX = centerX - (centerX - this._translateX) * scaleChange;
    this._translateY = centerY - (centerY - this._translateY) * scaleChange;
    this._scale = newScale;

    this._constrainTransform();
  }

  pan(deltaX: number, deltaY: number) {
    this._translateX += deltaX;
    this._translateY += deltaY;
    this._constrainTransform();
  }

  reset() {
    this._scale = 1;
    this._translateX = 0;
    this._translateY = 0;
  }

  // Transform screen coordinates to canvas coordinates
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this._translateX) / this._scale,
      y: (screenY - this._translateY) / this._scale,
    };
  }

  // Transform canvas coordinates to screen coordinates
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX * this._scale + this._translateX,
      y: canvasY * this._scale + this._translateY,
    };
  }

  private _constrainTransform() {
    const scaledWidth = this._canvasWidth * this._scale;
    const scaledHeight = this._canvasHeight * this._scale;

    // Constrain translation to keep canvas visible
    if (scaledWidth <= this._containerWidth) {
      // Center horizontally if canvas is smaller than container
      this._translateX = Math.round((this._containerWidth - scaledWidth) / 2);
    } else {
      // Constrain to prevent showing empty space
      const maxTranslateX = 0;
      const minTranslateX = this._containerWidth - scaledWidth;
      this._translateX = Math.max(minTranslateX, Math.min(maxTranslateX, this._translateX));
    }

    if (scaledHeight <= this._containerHeight) {
      // Center vertically if canvas is smaller than container
      this._translateY = Math.round((this._containerHeight - scaledHeight) / 2);
    } else {
      // Constrain to prevent showing empty space
      const maxTranslateY = 0;
      const minTranslateY = this._containerHeight - scaledHeight;
      this._translateY = Math.max(minTranslateY, Math.min(maxTranslateY, this._translateY));
    }
  }

  generateTransformCSS(): string {
    return `translate(${this._translateX}px, ${this._translateY}px) scale(${this._scale})`;
  }
}

export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export class ModifierKeyManager {
  private _modifiers: ModifierKeys = {
    ctrl: false,
    shift: false,
    alt: false,
  };

  private _onModifierChange?: (modifiers: ModifierKeys) => void;

  constructor(onModifierChange?: (modifiers: ModifierKeys) => void) {
    this._onModifierChange = onModifierChange;
  }

  get modifiers(): ModifierKeys {
    return { ...this._modifiers };
  }

  setModifier(key: keyof ModifierKeys, active: boolean) {
    if (this._modifiers[key] !== active) {
      this._modifiers[key] = active;
      this._onModifierChange?.(this.modifiers);
    }
  }

  toggleModifier(key: keyof ModifierKeys) {
    this.setModifier(key, !this._modifiers[key]);
  }

  resetAll() {
    this._modifiers.ctrl = false;
    this._modifiers.shift = false;
    this._modifiers.alt = false;
    this._onModifierChange?.(this.modifiers);
  }

  // Generate key state for UIState
  generateKeyState(): Set<string> {
    const keys = new Set<string>();
    if (this._modifiers.ctrl) keys.add("CTRL");
    if (this._modifiers.shift) keys.add("SHIFT");
    if (this._modifiers.alt) keys.add("ALT");
    return keys;
  }
}
