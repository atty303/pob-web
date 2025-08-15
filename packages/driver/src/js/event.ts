import { KeyboardState, type KeyboardStateCallbacks } from "./keyboard";

function mouseString(e: MouseEvent) {
  return ["LEFTBUTTON", "MIDDLEBUTTON", "RIGHTBUTTON", "MOUSE4", "MOUSE5"][e.button];
}

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
  readonly keyboardState: KeyboardState;

  private _cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private _panModeEnabled = false;

  // Touch state tracking
  private _touches: Map<number, { x: number; y: number; startTime: number }> = new Map();
  private _longPressTimer: number | null = null;
  private _lastTapTime = 0;
  private _twoFingerDistance = 0;
  private _twoFingerCenter: { x: number; y: number } = { x: 0, y: 0 };
  private _isZooming = false;
  private _isPanning = false;
  private _isPanModeActive = false;
  private _isMousePanning = false;
  private _mouseStartPos: { x: number; y: number } | null = null;

  get uiState() {
    return {
      x: this._cursorPosition.x,
      y: this._cursorPosition.y,
      keys: this.keyboardState.keys,
    };
  }

  constructor(
    readonly el: HTMLElement,
    readonly callbacks: Callbacks,
  ) {
    // Initialize keyboard state with callbacks that delegate to the provided callbacks
    this.keyboardState = new KeyboardState({
      onKeyDown: (key, doubleClick) => callbacks.onKeyDown(key, doubleClick, this.uiState),
      onKeyUp: (key, doubleClick) => callbacks.onKeyUp(key, doubleClick, this.uiState),
      onChar: (char, doubleClick) => callbacks.onChar(char, doubleClick, this.uiState),
    });
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

  setPanMode(enabled: boolean) {
    this._panModeEnabled = enabled;
    // Clean up mouse panning state when mode changes
    if (!enabled) {
      this._isMousePanning = false;
      this._mouseStartPos = null;
    }
  }

  private preventDefault(e: Event) {
    e.preventDefault();
  }

  private handleVisibilityChange() {
    this.callbacks.onVisibilityChange(this.el.ownerDocument.visibilityState === "visible");
  }

  private handleMouseMove(e: MouseEvent) {
    const newPos = { x: e.offsetX, y: e.offsetY };

    // Handle pan mode mouse dragging
    if (this._panModeEnabled && this._isMousePanning && this._mouseStartPos) {
      const deltaX = newPos.x - this._mouseStartPos.x;
      const deltaY = newPos.y - this._mouseStartPos.y;

      // Only pan if there's actual movement
      if (deltaX !== 0 || deltaY !== 0) {
        this.callbacks.onPan?.(deltaX, deltaY);
        this._mouseStartPos = newPos;
      }
    }

    this._cursorPosition = newPos;

    // Only send mouse move to PoB if not in pan mode or not currently panning
    if (!this._panModeEnabled || !this._isMousePanning) {
      this.callbacks.onMouseMove(this.uiState);
    }
  }

  private handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);

    if (this._panModeEnabled && name === "LEFTBUTTON") {
      // In pan mode, left click starts panning
      this._isMousePanning = true;
      this._mouseStartPos = { x: e.offsetX, y: e.offsetY };
    } else if (name) {
      this.keyboardState.addPhysicalKey(name);
      this.callbacks.onKeyDown(name, 0, this.uiState);
    }
    this.el.focus();
  }

  private handleMouseUp(e: MouseEvent) {
    e.preventDefault();
    const name = mouseString(e);

    if (this._panModeEnabled && name === "LEFTBUTTON" && this._isMousePanning) {
      // End mouse panning
      this._isMousePanning = false;
      this._mouseStartPos = null;
    } else if (name) {
      this.keyboardState.removePhysicalKey(name);
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
    const domKey = e.key; // Use DOM event key name directly

    // Use keyboard state to handle all key logic including special character mappings
    this.keyboardState.addPhysicalKey(domKey);
    this.keyboardState.keydown(domKey, 0);
  }

  private handleKeyPress(e: KeyboardEvent) {
    e.preventDefault();
    this.keyboardState.keypress(e.key, 0);
  }

  private handleKeyUp(e: KeyboardEvent) {
    e.preventDefault();
    const domKey = e.key; // Use DOM event key name directly

    // TODO: order is correct?
    this.keyboardState.removePhysicalKey(domKey);
    this.keyboardState.keyup(domKey, 0);
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

      if (!this._panModeEnabled) {
        // Direct interaction mode: prepare for potential drag or long press
        this._isPanModeActive = false; // Don't start drag yet

        // Set long press timer for right click
        this._longPressTimer = window.setTimeout(() => {
          // Immediately fire right click down and up
          this.callbacks.onKeyDown("RIGHTBUTTON", 0, this.uiState);
          this.callbacks.onKeyUp("RIGHTBUTTON", 0, this.uiState);
          this._longPressTimer = null;
        }, 300);
      } else {
        // Pan tool mode: just mouse move for single tap
        this.callbacks.onMouseMove(this.uiState);

        // Record tap time for potential double tap detection
        this._lastTapTime = currentTime;
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

      if (!this._panModeEnabled) {
        // Direct interaction mode: check if we should start drag
        if (!this._isPanModeActive && this._longPressTimer) {
          // Check if finger moved enough to start drag
          const touchData = this._touches.get(touch.identifier);
          if (touchData) {
            const distance = this.calculateDistance(touchData, pos);
            if (distance > 5) {
              // Start drag - cancel long press and begin left button drag
              clearTimeout(this._longPressTimer);
              this._longPressTimer = null;
              this._isPanModeActive = true;
              this.keyboardState.addPhysicalKey("LEFTBUTTON");
              this.callbacks.onKeyDown("LEFTBUTTON", 0, this.uiState);
            }
          }
        }

        if (this._isPanModeActive) {
          // Send mouse move with button down (drag)
          this.callbacks.onMouseMove(this.uiState);
        } else {
          // Just mouse move (no drag yet)
          this.callbacks.onMouseMove(this.uiState);
        }
      } else {
        // Pan tool mode: just mouse move (no click drag)
        this.callbacks.onMouseMove(this.uiState);
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

      if (!this._panModeEnabled) {
        // Direct interaction mode: two finger movement becomes wheel
        if (Math.abs(centerDelta.y) > Math.abs(centerDelta.x)) {
          // Vertical movement - wheel up/down
          const direction = centerDelta.y > 0 ? "WHEELDOWN" : "WHEELUP";
          this.callbacks.onKeyUp(direction, 0, this.uiState);
        }
      } else {
        // Pan mode: zoom and pan
        // Determine if this is zoom or pan (increased threshold to avoid accidental zoom)
        if (Math.abs(distanceDelta) > 10 && !this._isPanning) {
          this._isZooming = true;
          // Calculate relative scale change (not absolute scale)
          const scale = this._twoFingerDistance > 0 ? currentDistance / this._twoFingerDistance : 1;
          this.callbacks.onZoom?.(scale, this._twoFingerCenter.x, this._twoFingerCenter.y);
        } else if (!this._isZooming) {
          // Always pan if not zooming (remove distance threshold after initial detection)
          if (!this._isPanning && (Math.abs(centerDelta.x) > 5 || Math.abs(centerDelta.y) > 5)) {
            this._isPanning = true;
          }

          if (this._isPanning) {
            this.callbacks.onPan?.(centerDelta.x, centerDelta.y);
          }
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
      if (!this._panModeEnabled) {
        // Direct interaction mode: handle drag end or tap
        if (this._isPanModeActive) {
          // End drag
          this._isPanModeActive = false;

          if (this.keyboardState.hasKey("LEFTBUTTON")) {
            this.keyboardState.removePhysicalKey("LEFTBUTTON");
            this.callbacks.onKeyUp("LEFTBUTTON", 0, this.uiState);
          }
        } else if (this._longPressTimer) {
          // Single tap (not long press, not drag)
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;

          if (!this._isZooming && !this._isPanning) {
            // Generate single click
            this.keyboardState.addPhysicalKey("LEFTBUTTON");
            this.callbacks.onKeyDown("LEFTBUTTON", 0, this.uiState);

            // Schedule mouseup
            setTimeout(() => {
              if (this.keyboardState.hasKey("LEFTBUTTON")) {
                this.keyboardState.removePhysicalKey("LEFTBUTTON");
                this.callbacks.onKeyUp("LEFTBUTTON", 0, this.uiState);
              }
            }, 50);
          }
        }
      } else {
        // Pan tool mode: no click events on single tap
        // Just clean up any gesture states
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

    // Clean up pan mode state
    if (this._isPanModeActive && this.keyboardState.hasKey("LEFTBUTTON")) {
      this.keyboardState.removePhysicalKey("LEFTBUTTON");
      this.callbacks.onKeyUp("LEFTBUTTON", 0, this.uiState);
    }

    this._isZooming = false;
    this._isPanning = false;
    this._isPanModeActive = false;
  }
}
