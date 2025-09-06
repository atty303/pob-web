import type { PoBKey, PoBKeyboardState } from "./keyboard";

export type MouseState = {
  x: number;
  y: number;
};

const MOUSE_BUTTONS = ["LEFTBUTTON", "MIDDLEBUTTON", "RIGHTBUTTON", "MOUSE4", "MOUSE5"] as PoBKey[];
function mouseString(e: MouseEvent): PoBKey | undefined {
  return MOUSE_BUTTONS[e.button];
}

export type MouseCallbacks = {
  onMouseMove: () => void;
  onMouseStateUpdate?: (mouseState: MouseState) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onZoom?: (scale: number, centerX: number, centerY: number) => void;
};

export class MouseHandler {
  private _cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private _panModeEnabled = false;
  private _isMousePanning = false;
  private _mouseStartPos: { x: number; y: number } | null = null;

  private _touches: Map<number, { x: number; y: number; startTime: number }> = new Map();
  private _longPressTimer: number | null = null;
  private _lastTapTime = 0;
  private _twoFingerDistance = 0;
  private _twoFingerCenter: { x: number; y: number } = { x: 0, y: 0 };
  private _isZooming = false;
  private _isPanning = false;
  private _isPanModeActive = false;
  private _threeFingerPanning = false;
  private _threeFingerCenter: { x: number; y: number } = { x: 0, y: 0 };
  private _multiTouchPreventionTimer: number | null = null;
  private _allowMouseUpdates = true;
  private _isTouchLeftButtonDown = false;

  private _wheelAccumulator = 0;
  private static readonly WHEEL_SENSITIVITY = 4;

  get mouseState(): MouseState {
    return {
      x: this._cursorPosition.x,
      y: this._cursorPosition.y,
    };
  }

  private updateMouseState(pos: { x: number; y: number }) {
    this._cursorPosition = pos;
    if (this._allowMouseUpdates) {
      this.callbacks.onMouseStateUpdate?.(this.mouseState);
    }
  }

  constructor(
    private el: HTMLElement,
    private callbacks: MouseCallbacks,
    private pobKeyboardState: PoBKeyboardState,
  ) {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);

    el.addEventListener("mousemove", this.handleMouseMove);
    el.addEventListener("mousedown", this.handleMouseDown);
    el.addEventListener("mouseup", this.handleMouseUp);
    el.addEventListener("dblclick", this.handleDblClick);
    el.addEventListener("wheel", this.handleWheel, { passive: false });

    el.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    el.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    el.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    el.addEventListener("touchcancel", this.handleTouchCancel, { passive: false });
  }

  setPanMode(enabled: boolean) {
    this._panModeEnabled = enabled;
    if (!enabled) {
      this._isMousePanning = false;
      this._mouseStartPos = null;
    }
  }

  destroy() {
    this.el.removeEventListener("mousemove", this.handleMouseMove);
    this.el.removeEventListener("mousedown", this.handleMouseDown);
    this.el.removeEventListener("mouseup", this.handleMouseUp);
    this.el.removeEventListener("dblclick", this.handleDblClick);
    this.el.removeEventListener("wheel", this.handleWheel);

    this.el.removeEventListener("touchstart", this.handleTouchStart);
    this.el.removeEventListener("touchmove", this.handleTouchMove);
    this.el.removeEventListener("touchend", this.handleTouchEnd);
    this.el.removeEventListener("touchcancel", this.handleTouchCancel);
  }

  cleanup() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
    }
    if (this._multiTouchPreventionTimer) {
      clearTimeout(this._multiTouchPreventionTimer);
    }
  }

  handleMouseMove(e: MouseEvent) {
    const rect = this.el.getBoundingClientRect();
    const newPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (this._panModeEnabled && this._isMousePanning && this._mouseStartPos) {
      const deltaX = newPos.x - this._mouseStartPos.x;
      const deltaY = newPos.y - this._mouseStartPos.y;

      if (deltaX !== 0 || deltaY !== 0) {
        this.callbacks.onPan?.(deltaX, deltaY);
        this._mouseStartPos = newPos;
      }

      this.updateMouseState(newPos);
      return;
    }

    this.updateMouseState(newPos);

    if (!this._panModeEnabled || !this._isMousePanning) {
      this.callbacks.onMouseMove();
    }
  }

  handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);

    const rect = this.el.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.updateMouseState(pos);

    if (this._panModeEnabled && name === "LEFTBUTTON") {
      this._isMousePanning = true;
      this._mouseStartPos = pos;
    } else if (name) {
      this.pobKeyboardState.keydown(name, 0);
    }
    this.el.focus();
  }

  handleMouseUp(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);

    const rect = this.el.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.updateMouseState(pos);

    if (this._panModeEnabled && name === "LEFTBUTTON" && this._isMousePanning) {
      this._isMousePanning = false;
      this._mouseStartPos = null;
    } else if (name) {
      this.pobKeyboardState.keyup(name);
    }
    this.el.focus();
  }

  handleDblClick(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);

    const rect = this.el.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.updateMouseState(pos);

    if (name) {
      this.pobKeyboardState.keydown(name, 1);
    }
    this.el.focus();
  }

  handleWheel(e: WheelEvent) {
    e.preventDefault();

    const rect = this.el.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.updateMouseState(pos);

    const name = (e.deltaY > 0 ? "WHEELDOWN" : "WHEELUP") as PoBKey;
    this.pobKeyboardState.keyup(name);
    this.el.focus();
  }

  private getTouchPosition(touch: Touch): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  private calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  private calculateCenter(p1: { x: number; y: number }, p2: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const currentTime = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pos = this.getTouchPosition(touch);
      this._touches.set(touch.identifier, {
        x: pos.x,
        y: pos.y,
        startTime: currentTime,
      });
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = this.getTouchPosition(touch);

      this._allowMouseUpdates = false;

      if (this._multiTouchPreventionTimer) {
        clearTimeout(this._multiTouchPreventionTimer);
      }

      this._multiTouchPreventionTimer = window.setTimeout(() => {
        if (this._touches.size === 1) {
          this._allowMouseUpdates = true;
          this.updateMouseState(pos);
          if (this._panModeEnabled) {
            this.callbacks.onMouseMove();
          }
        }
        this._multiTouchPreventionTimer = null;
      }, 50);

      this._cursorPosition = pos;

      if (!this._panModeEnabled) {
        this._isPanModeActive = false;

        this._longPressTimer = window.setTimeout(() => {
          this.pobKeyboardState.keydown("RIGHTBUTTON" as PoBKey, 0);
          this.pobKeyboardState.keyup("RIGHTBUTTON" as PoBKey);
          this._longPressTimer = null;
        }, 300);
      } else {
        this._lastTapTime = currentTime;
      }
    } else if (e.touches.length === 2) {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }

      if (this._multiTouchPreventionTimer) {
        clearTimeout(this._multiTouchPreventionTimer);
        this._multiTouchPreventionTimer = null;
      }
      this._allowMouseUpdates = false;

      const touch1 = this.getTouchPosition(e.touches[0]);
      const touch2 = this.getTouchPosition(e.touches[1]);
      this._twoFingerDistance = this.calculateDistance(touch1, touch2);
      this._twoFingerCenter = this.calculateCenter(touch1, touch2);
      this._isZooming = false;
      this._isPanning = false;
    } else if (e.touches.length === 3) {
      if (this._multiTouchPreventionTimer) {
        clearTimeout(this._multiTouchPreventionTimer);
        this._multiTouchPreventionTimer = null;
      }
      this._allowMouseUpdates = false;

      this._isZooming = false;
      this._isPanning = false;

      const touch1 = this.getTouchPosition(e.touches[0]);
      const touch2 = this.getTouchPosition(e.touches[1]);
      const touch3 = this.getTouchPosition(e.touches[2]);
      this._threeFingerCenter = {
        x: (touch1.x + touch2.x + touch3.x) / 3,
        y: (touch1.y + touch2.y + touch3.y) / 3,
      };
      this._threeFingerPanning = false;
    }

    this.el.focus();
  }

  handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = this.getTouchPosition(touch);
      this.updateMouseState(pos);

      if (this._allowMouseUpdates) {
        if (!this._panModeEnabled) {
          if (!this._isPanModeActive && this._longPressTimer) {
            const touchData = this._touches.get(touch.identifier);
            if (touchData) {
              const distance = this.calculateDistance(touchData, pos);
              if (distance > 5) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
                this._isPanModeActive = true;
                this.pobKeyboardState.keydown("LEFTBUTTON" as PoBKey, 0);
                this._isTouchLeftButtonDown = true;
              }
            }
          }

          if (this._isPanModeActive) {
            this.callbacks.onMouseMove();
          } else {
            this.callbacks.onMouseMove();
          }
        } else {
          this.callbacks.onMouseMove();
        }
      }
    } else if (e.touches.length === 2) {
      if (!this._threeFingerPanning) {
        const touch1 = this.getTouchPosition(e.touches[0]);
        const touch2 = this.getTouchPosition(e.touches[1]);
        const currentDistance = this.calculateDistance(touch1, touch2);
        const currentCenter = this.calculateCenter(touch1, touch2);

        const distanceDelta = currentDistance - this._twoFingerDistance;
        const centerDelta = {
          x: currentCenter.x - this._twoFingerCenter.x,
          y: currentCenter.y - this._twoFingerCenter.y,
        };

        if (!this._isZooming && Math.abs(distanceDelta) > 5 && !this._isPanning) {
          this._isZooming = true;
        }

        if (this._isZooming && !this._isPanning) {
          const scale = this._twoFingerDistance > 0 ? currentDistance / this._twoFingerDistance : 1;
          this.callbacks.onZoom?.(scale, this._twoFingerCenter.x, this._twoFingerCenter.y);
        } else if (!this._isZooming && !this._panModeEnabled) {
          if (Math.abs(centerDelta.y) > Math.abs(centerDelta.x)) {
            this._wheelAccumulator += centerDelta.y;

            if (Math.abs(this._wheelAccumulator) >= MouseHandler.WHEEL_SENSITIVITY) {
              const direction = (this._wheelAccumulator > 0 ? "WHEELDOWN" : "WHEELUP") as PoBKey;
              this.pobKeyboardState.keyup(direction);
              this._wheelAccumulator = 0;
            }
          }
        }

        this._twoFingerDistance = currentDistance;
        this._twoFingerCenter = currentCenter;
      }
    } else if (e.touches.length === 3) {
      const touch1 = this.getTouchPosition(e.touches[0]);
      const touch2 = this.getTouchPosition(e.touches[1]);
      const touch3 = this.getTouchPosition(e.touches[2]);
      const currentCenter = {
        x: (touch1.x + touch2.x + touch3.x) / 3,
        y: (touch1.y + touch2.y + touch3.y) / 3,
      };

      const centerDelta = {
        x: currentCenter.x - this._threeFingerCenter.x,
        y: currentCenter.y - this._threeFingerCenter.y,
      };

      if (!this._threeFingerPanning && (Math.abs(centerDelta.x) > 5 || Math.abs(centerDelta.y) > 5)) {
        this._threeFingerPanning = true;
        this._isZooming = false;
        this._isPanning = false;
      }

      if (this._threeFingerPanning) {
        this.callbacks.onPan?.(centerDelta.x, centerDelta.y);
      }

      this._threeFingerCenter = currentCenter;
    }
  }

  handleTouchEnd(e: TouchEvent) {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this._touches.delete(touch.identifier);
    }

    if (e.touches.length === 0) {
      if (!this._panModeEnabled) {
        if (this._isPanModeActive) {
          this._isPanModeActive = false;

          if (this._isTouchLeftButtonDown) {
            this.pobKeyboardState.keyup("LEFTBUTTON" as PoBKey);
            this._isTouchLeftButtonDown = false;
          }
        } else if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;

          if (!this._isZooming && !this._isPanning) {
            this.pobKeyboardState.keydown("LEFTBUTTON" as PoBKey, 0);
            setTimeout(() => {
              this.pobKeyboardState.keyup("LEFTBUTTON" as PoBKey);
            }, 50);
          }
        }
      } else {
      }

      this._isZooming = false;
      this._isPanning = false;
      this._wheelAccumulator = 0; // Reset wheel accumulator
      this._threeFingerPanning = false; // Reset three finger panning

      this._allowMouseUpdates = true;
    }

    this.el.focus();
  }

  handleTouchCancel(e: TouchEvent) {
    e.preventDefault();

    this._touches.clear();

    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    if (this._isPanModeActive && this._isTouchLeftButtonDown) {
      this.pobKeyboardState.keyup("LEFTBUTTON" as PoBKey);
    }

    this._isZooming = false;
    this._isPanning = false;
    this._isPanModeActive = false;
    this._wheelAccumulator = 0;
    this._threeFingerPanning = false;

    this._allowMouseUpdates = true;
  }
}
