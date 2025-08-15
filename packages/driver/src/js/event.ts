function mouseString(e: MouseEvent) {
  return ["LEFTBUTTON", "MIDDLEBUTTON", "RIGHTBUTTON", "MOUSE4", "MOUSE5"][e.button];
}

const KEY_MAP = new Map<string, string>([
  ["Backspace", "BACK"],
  ["Tab", "TAB"],
  ["Enter", "RETURN"],
  ["Escape", "ESCAPE"],
  ["Shift", "SHIFT"],
  ["Control", "CTRL"],
  ["Alt", "ALT"],
  ["Pause", "PAUSE"],
  ["PageUp", "PAGEUP"],
  ["PageDown", "PAGEDOWN"],
  ["End", "END"],
  ["Home", "HOME"],
  ["PrintScreen", "PRINTSCREEN"],
  ["Insert", "INSERT"],
  ["Delete", "DELETE"],
  ["ArrowUp", "UP"],
  ["ArrowDown", "DOWN"],
  ["ArrowLeft", "LEFT"],
  ["ArrowRight", "RIGHT"],
  ["F1", "F1"],
  ["F2", "F2"],
  ["F3", "F3"],
  ["F4", "F4"],
  ["F5", "F5"],
  ["F6", "F6"],
  ["F7", "F7"],
  ["F8", "F8"],
  ["F9", "F9"],
  ["F10", "F10"],
  ["F11", "F11"],
  ["F12", "F12"],
  ["F13", "F13"],
  ["F14", "F14"],
  ["F15", "F15"],
  ["NumLock", "NUMLOCK"],
  ["ScrollLock", "SCROLLLOCK"],
]);

const EXTRA_KEY_MAP = new Map<string, string>([
  ["Backspace", "\b"],
  ["Tab", "\t"],
  ["Enter", "\r"],
  ["Escape", "\u001B"],
]);

type Callbacks = {
  onMouseMove: (uiState: UIState) => void;
  onKeyDown: (key: string, doubleClick: number, uiState: UIState) => void;
  onKeyUp: (key: string, doubleClick: number, uiState: UIState) => void;
  onChar: (char: string, doubleClick: number, uiState: UIState) => void;
  onVisibilityChange: (visible: boolean) => void;
  onZoom?: (scale: number, centerX: number, centerY: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
};

export type UIState = {
  x: number;
  y: number;
  keys: Set<string>;
};

export class UIEventManager {
  readonly destroy: () => void;

  private _cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private _keyState: Set<string> = new Set();
  private _dragModeEnabled = false;

  // Touch state tracking
  private _touches: Map<number, { x: number; y: number; startTime: number }> = new Map();
  private _longPressTimer: number | null = null;
  private _lastTapTime = 0;
  private _twoFingerDistance = 0;
  private _twoFingerCenter: { x: number; y: number } = { x: 0, y: 0 };
  private _isZooming = false;
  private _isPanning = false;
  private _isDragModeActive = false;

  get uiState() {
    return {
      x: this._cursorPosition.x,
      y: this._cursorPosition.y,
      keys: this._keyState,
    };
  }

  constructor(
    readonly el: HTMLElement,
    readonly callbacks: Callbacks,
  ) {
    const preventDefault = this.preventDefault.bind(this);
    const handleVisibilityChange = this.handleVisibilityChange.bind(this);
    const handleMouseMove = this.handleMouseMove.bind(this);
    const handleMouseDown = this.handleMouseDown.bind(this);
    const handleMouseUp = this.handleMouseUp.bind(this);
    const handleDblClick = this.handleDblClick.bind(this);
    const handleWheel = this.handleWheel.bind(this);
    const handleKeyDown = this.handleKeyDown.bind(this);
    const handleKeyPress = this.handleKeyPress.bind(this);
    const handleKeyUp = this.handleKeyUp.bind(this);
    const handleTouchStart = this.handleTouchStart.bind(this);
    const handleTouchMove = this.handleTouchMove.bind(this);
    const handleTouchEnd = this.handleTouchEnd.bind(this);
    const handleTouchCancel = this.handleTouchCancel.bind(this);

    el.ownerDocument.addEventListener("visibilitychange", handleVisibilityChange);

    el.addEventListener("contextmenu", preventDefault);
    el.addEventListener("copy", preventDefault);
    el.addEventListener("paste", preventDefault);
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("dblclick", handleDblClick);
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("keypress", handleKeyPress);
    el.addEventListener("keyup", handleKeyUp);
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: false });
    el.addEventListener("touchcancel", handleTouchCancel, { passive: false });

    this.destroy = () => {
      el.ownerDocument.removeEventListener("visibilitychange", handleVisibilityChange);

      el.removeEventListener("contextmenu", preventDefault);
      el.removeEventListener("copy", preventDefault);
      el.removeEventListener("paste", preventDefault);
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("dblclick", handleDblClick);
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("keypress", handleKeyPress);
      el.removeEventListener("keyup", handleKeyUp);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchCancel);

      // Clean up timers
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
      }
    };

    el.focus();
  }

  setDragMode(enabled: boolean) {
    this._dragModeEnabled = enabled;
  }

  private preventDefault(e: Event) {
    e.preventDefault();
  }

  private handleVisibilityChange() {
    this.callbacks.onVisibilityChange(this.el.ownerDocument.visibilityState === "visible");
  }

  private handleMouseMove(e: MouseEvent) {
    this._cursorPosition = { x: e.offsetX, y: e.offsetY };
    this.callbacks.onMouseMove(this.uiState);
  }

  private handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);
    if (name) {
      this._keyState.add(name);
      this.callbacks.onKeyDown(name, 0, this.uiState);
    }
    this.el.focus();
  }

  private handleMouseUp(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);
    if (name) {
      this._keyState.delete(name);
      this.callbacks.onKeyUp(name, -1, this.uiState); // TODO: 0
    }
    this.el.focus();
  }

  private handleDblClick(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);
    if (name) {
      this.callbacks.onKeyDown(name, 1, this.uiState);
    }
    this.el.focus();
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const name = e.deltaY > 0 ? "WHEELDOWN" : "WHEELUP";
    this.callbacks.onKeyUp(name, 0, this.uiState);
    this.el.focus();
  }

  private handleKeyDown(e: KeyboardEvent) {
    ["Tab", "Escape", "Enter"].includes(e.key) && e.preventDefault();
    const key = e.key.length === 1 ? e.key.toLowerCase() : KEY_MAP.get(e.key);
    if (key) {
      this._keyState.add(key);
      this.callbacks.onKeyDown(key, 0, this.uiState);
      const ex = EXTRA_KEY_MAP.get(e.key);
      if (ex) {
        this.callbacks.onChar(ex, 0, this.uiState);
      }
    }
  }

  private handleKeyPress(e: KeyboardEvent) {
    e.preventDefault();
    this.callbacks.onChar(e.key, 0, this.uiState);
  }

  private handleKeyUp(e: KeyboardEvent) {
    e.preventDefault();
    const key = e.key.length === 1 ? e.key.toLowerCase() : KEY_MAP.get(e.key);
    if (key) {
      // TODO: order is correct?
      this._keyState.delete(key);
      this.callbacks.onKeyUp(key, 0, this.uiState);
    }
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

  private handleTouchStart(e: TouchEvent) {
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
      // Single touch - behavior depends on drag mode
      const touch = e.touches[0];
      const pos = this.getTouchPosition(touch);
      this._cursorPosition = pos;

      if (this._dragModeEnabled) {
        // Drag mode: start click drag immediately
        this._isDragModeActive = true;
        this._keyState.add("LEFTBUTTON");
        this.callbacks.onKeyDown("LEFTBUTTON", 0, this.uiState);
      } else {
        // Normal mode: potential tap or long press
        // Check for double tap
        if (currentTime - this._lastTapTime < 300) {
          // Double tap detected
          this.callbacks.onKeyDown("LEFTBUTTON", 1, this.uiState);
          this._lastTapTime = 0;
          return;
        }

        // Set long press timer for right click
        this._longPressTimer = window.setTimeout(() => {
          this._keyState.add("RIGHTBUTTON");
          this.callbacks.onKeyDown("RIGHTBUTTON", 0, this.uiState);
          this._longPressTimer = null;
        }, 500);
      }
    } else if (e.touches.length === 2) {
      // Two finger touch - behavior depends on drag mode
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }

      const touch1 = this.getTouchPosition(e.touches[0]);
      const touch2 = this.getTouchPosition(e.touches[1]);
      this._twoFingerDistance = this.calculateDistance(touch1, touch2);
      this._twoFingerCenter = this.calculateCenter(touch1, touch2);
      this._isZooming = false;
      this._isPanning = false;
    }

    this.el.focus();
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 1) {
      // Single finger move
      const touch = e.touches[0];
      const pos = this.getTouchPosition(touch);
      this._cursorPosition = pos;

      if (this._dragModeEnabled && this._isDragModeActive) {
        // Drag mode: send mouse move with button down
        this.callbacks.onMouseMove(this.uiState);
      } else {
        // Normal mode: just mouse move
        this.callbacks.onMouseMove(this.uiState);

        // Cancel long press if finger moves too much
        const touchData = this._touches.get(touch.identifier);
        if (touchData && this._longPressTimer) {
          const distance = this.calculateDistance(touchData, pos);
          if (distance > 10) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
          }
        }
      }
    } else if (e.touches.length === 2) {
      // Two finger gesture
      const touch1 = this.getTouchPosition(e.touches[0]);
      const touch2 = this.getTouchPosition(e.touches[1]);
      const currentDistance = this.calculateDistance(touch1, touch2);
      const currentCenter = this.calculateCenter(touch1, touch2);

      const distanceDelta = currentDistance - this._twoFingerDistance;
      const centerDelta = {
        x: currentCenter.x - this._twoFingerCenter.x,
        y: currentCenter.y - this._twoFingerCenter.y,
      };

      if (this._dragModeEnabled) {
        // Drag mode: two finger movement becomes wheel
        if (Math.abs(centerDelta.y) > Math.abs(centerDelta.x)) {
          // Vertical movement - wheel up/down
          const direction = centerDelta.y > 0 ? "WHEELDOWN" : "WHEELUP";
          this.callbacks.onKeyUp(direction, 0, this.uiState);
        }
      } else {
        // Normal mode: zoom and pan
        // Determine if this is zoom or pan
        if (Math.abs(distanceDelta) > 2 && !this._isPanning) {
          this._isZooming = true;
          // Calculate relative scale change (not absolute scale)
          const scale = this._twoFingerDistance > 0 ? currentDistance / this._twoFingerDistance : 1;
          this.callbacks.onZoom?.(scale, this._twoFingerCenter.x, this._twoFingerCenter.y);
        } else if ((Math.abs(centerDelta.x) > 5 || Math.abs(centerDelta.y) > 5) && !this._isZooming) {
          this._isPanning = true;
          this.callbacks.onPan?.(centerDelta.x, centerDelta.y);
        }
      }

      this._twoFingerDistance = currentDistance;
      this._twoFingerCenter = currentCenter;
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this._touches.delete(touch.identifier);
    }

    if (e.touches.length === 0) {
      // All touches ended
      if (this._dragModeEnabled && this._isDragModeActive) {
        // Drag mode: end drag
        this._isDragModeActive = false;
        if (this._keyState.has("LEFTBUTTON")) {
          this._keyState.delete("LEFTBUTTON");
          this.callbacks.onKeyUp("LEFTBUTTON", 0, this.uiState);
        }
      } else {
        // Normal mode
        if (this._longPressTimer) {
          // Single tap (not long press)
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;

          if (!this._isZooming && !this._isPanning) {
            this._keyState.add("LEFTBUTTON");
            this.callbacks.onKeyDown("LEFTBUTTON", 0, this.uiState);

            // Schedule mouseup
            setTimeout(() => {
              this._keyState.delete("LEFTBUTTON");
              this.callbacks.onKeyUp("LEFTBUTTON", 0, this.uiState);
            }, 50);

            this._lastTapTime = Date.now();
          }
        }

        // Clean up right button if it was pressed
        if (this._keyState.has("RIGHTBUTTON")) {
          this._keyState.delete("RIGHTBUTTON");
          this.callbacks.onKeyUp("RIGHTBUTTON", 0, this.uiState);
        }
      }

      this._isZooming = false;
      this._isPanning = false;
    }

    this.el.focus();
  }

  private handleTouchCancel(e: TouchEvent) {
    e.preventDefault();

    // Clean up all touch state
    this._touches.clear();

    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    // Clean up drag mode state
    if (this._isDragModeActive && this._keyState.has("LEFTBUTTON")) {
      this._keyState.delete("LEFTBUTTON");
      this.callbacks.onKeyUp("LEFTBUTTON", 0, this.uiState);
    }

    if (this._keyState.has("RIGHTBUTTON")) {
      this._keyState.delete("RIGHTBUTTON");
      this.callbacks.onKeyUp("RIGHTBUTTON", 0, this.uiState);
    }

    this._isZooming = false;
    this._isPanning = false;
    this._isDragModeActive = false;
  }
}
