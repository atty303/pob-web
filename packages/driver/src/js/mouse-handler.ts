export type MouseState = {
  x: number;
  y: number;
};

function mouseString(e: MouseEvent) {
  return ["LEFTBUTTON", "MIDDLEBUTTON", "RIGHTBUTTON", "MOUSE4", "MOUSE5"][e.button];
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

  // Touch state tracking
  private _touches: Map<number, { x: number; y: number; startTime: number }> = new Map();
  private _longPressTimer: number | null = null;
  private _lastTapTime = 0;
  private _twoFingerDistance = 0;
  private _twoFingerCenter: { x: number; y: number } = { x: 0, y: 0 };
  private _isZooming = false;
  private _isPanning = false;
  private _isPanModeActive = false;

  // Two finger wheel sensitivity
  private _wheelAccumulator = 0;
  private static readonly WHEEL_SENSITIVITY = 4; // Require 4x movement for one wheel event

  get mouseState(): MouseState {
    return {
      x: this._cursorPosition.x,
      y: this._cursorPosition.y,
    };
  }

  private updateMouseState(pos: { x: number; y: number }) {
    this._cursorPosition = pos;
    // Notify driver of mouse state update
    this.callbacks.onMouseStateUpdate?.(this.mouseState);
  }

  constructor(
    private el: HTMLElement,
    private callbacks: MouseCallbacks,
    private keyboardCallbacks: {
      addPhysicalKey?: (key: string) => void;
      removePhysicalKey?: (key: string) => void;
      hasKey?: (key: string) => boolean;
      onKeyDown: (key: string, doubleClick: number) => void;
      onKeyUp: (key: string, doubleClick: number) => void;
    },
  ) {
    // Bind event handlers
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);

    // Add mouse event listeners
    el.addEventListener("mousemove", this.handleMouseMove);
    el.addEventListener("mousedown", this.handleMouseDown);
    el.addEventListener("mouseup", this.handleMouseUp);
    el.addEventListener("dblclick", this.handleDblClick);
    el.addEventListener("wheel", this.handleWheel, { passive: false });

    // Add touch event listeners
    el.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    el.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    el.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    el.addEventListener("touchcancel", this.handleTouchCancel, { passive: false });
  }

  setPanMode(enabled: boolean) {
    this._panModeEnabled = enabled;
    // Clean up mouse panning state when mode changes
    if (!enabled) {
      this._isMousePanning = false;
      this._mouseStartPos = null;
    }
  }

  destroy() {
    // Remove mouse event listeners
    this.el.removeEventListener("mousemove", this.handleMouseMove);
    this.el.removeEventListener("mousedown", this.handleMouseDown);
    this.el.removeEventListener("mouseup", this.handleMouseUp);
    this.el.removeEventListener("dblclick", this.handleDblClick);
    this.el.removeEventListener("wheel", this.handleWheel);

    // Remove touch event listeners
    this.el.removeEventListener("touchstart", this.handleTouchStart);
    this.el.removeEventListener("touchmove", this.handleTouchMove);
    this.el.removeEventListener("touchend", this.handleTouchEnd);
    this.el.removeEventListener("touchcancel", this.handleTouchCancel);
  }

  cleanup() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
    }
  }

  handleMouseMove(e: MouseEvent) {
    // Use getBoundingClientRect for accurate coordinates with CSS transforms
    const rect = this.el.getBoundingClientRect();
    const newPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Handle pan mode mouse dragging - use screen coordinates for pan calculations
    if (this._panModeEnabled && this._isMousePanning && this._mouseStartPos) {
      const deltaX = newPos.x - this._mouseStartPos.x;
      const deltaY = newPos.y - this._mouseStartPos.y;

      // Only pan if there's actual movement
      if (deltaX !== 0 || deltaY !== 0) {
        this.callbacks.onPan?.(deltaX, deltaY);
        this._mouseStartPos = newPos;
      }

      // Update cursor position even during panning for accurate coordinates
      this.updateMouseState(newPos);
      return;
    }

    // Update mouse state and notify driver
    this.updateMouseState(newPos);

    // Only send mouse move to PoB if not in pan mode or not currently panning
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

    // Update mouse state for button events
    this.updateMouseState(pos);

    if (this._panModeEnabled && name === "LEFTBUTTON") {
      // In pan mode, left click starts panning
      this._isMousePanning = true;
      this._mouseStartPos = pos;
    } else if (name) {
      this.keyboardCallbacks.addPhysicalKey?.(name);
      this.keyboardCallbacks.onKeyDown(name, 0);
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

    // Update mouse state for button events
    this.updateMouseState(pos);

    if (this._panModeEnabled && name === "LEFTBUTTON" && this._isMousePanning) {
      // End mouse panning
      this._isMousePanning = false;
      this._mouseStartPos = null;
    } else if (name) {
      this.keyboardCallbacks.removePhysicalKey?.(name);
      this.keyboardCallbacks.onKeyUp(name, -1); // TODO: 0
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

    // Update mouse state for button events
    this.updateMouseState(pos);

    if (name) {
      this.keyboardCallbacks.onKeyDown(name, 1);
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

    // Update mouse state for wheel events
    this.updateMouseState(pos);

    const name = e.deltaY > 0 ? "WHEELDOWN" : "WHEELUP";
    this.keyboardCallbacks.onKeyUp(name, 0);
    this.el.focus();
  }

  // Touch event handlers
  private getTouchPosition(touch: Touch): { x: number; y: number } {
    // Calculate container coordinates from touch
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
      // Single touch - behavior depends on drag mode
      const touch = e.touches[0];
      const pos = this.getTouchPosition(touch);
      this.updateMouseState(pos);

      if (!this._panModeEnabled) {
        // Direct interaction mode: prepare for potential drag or long press
        this._isPanModeActive = false; // Don't start drag yet

        // Set long press timer for right click
        this._longPressTimer = window.setTimeout(() => {
          // Immediately fire right click down and up
          this.keyboardCallbacks.onKeyDown("RIGHTBUTTON", 0);
          this.keyboardCallbacks.onKeyUp("RIGHTBUTTON", 0);
          this._longPressTimer = null;
        }, 300);
      } else {
        // Pan tool mode: just mouse move for single tap
        this.callbacks.onMouseMove();

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

  handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (e.touches.length === 1) {
      // Single finger move
      const touch = e.touches[0];
      const pos = this.getTouchPosition(touch);
      this.updateMouseState(pos);

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
              this.keyboardCallbacks.addPhysicalKey?.("LEFTBUTTON");
              this.keyboardCallbacks.onKeyDown("LEFTBUTTON", 0);
            }
          }
        }

        if (this._isPanModeActive) {
          // Send mouse move with button down (drag)
          this.callbacks.onMouseMove();
        } else {
          // Just mouse move (no drag yet)
          this.callbacks.onMouseMove();
        }
      } else {
        // Pan tool mode: just mouse move (no click drag)
        this.callbacks.onMouseMove();
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
          // Accumulate vertical movement for wheel sensitivity
          this._wheelAccumulator += centerDelta.y;

          // Only trigger wheel event when accumulated movement exceeds threshold
          if (Math.abs(this._wheelAccumulator) >= MouseHandler.WHEEL_SENSITIVITY) {
            const direction = this._wheelAccumulator > 0 ? "WHEELDOWN" : "WHEELUP";
            this.keyboardCallbacks.onKeyUp(direction, 0);
            // Reset accumulator after firing wheel event
            this._wheelAccumulator = 0;
          }
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

  handleTouchEnd(e: TouchEvent) {
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

          if (this.keyboardCallbacks.hasKey?.("LEFTBUTTON")) {
            this.keyboardCallbacks.removePhysicalKey?.("LEFTBUTTON");
            this.keyboardCallbacks.onKeyUp("LEFTBUTTON", 0);
          }
        } else if (this._longPressTimer) {
          // Single tap (not long press, not drag)
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;

          if (!this._isZooming && !this._isPanning) {
            // Generate single click
            this.keyboardCallbacks.addPhysicalKey?.("LEFTBUTTON");
            this.keyboardCallbacks.onKeyDown("LEFTBUTTON", 0);

            // Schedule mouseup
            setTimeout(() => {
              if (this.keyboardCallbacks.hasKey?.("LEFTBUTTON")) {
                this.keyboardCallbacks.removePhysicalKey?.("LEFTBUTTON");
                this.keyboardCallbacks.onKeyUp("LEFTBUTTON", 0);
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
      this._wheelAccumulator = 0; // Reset wheel accumulator
    }

    this.el.focus();
  }

  handleTouchCancel(e: TouchEvent) {
    e.preventDefault();

    // Clean up all touch state
    this._touches.clear();

    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    // Clean up pan mode state
    if (this._isPanModeActive && this.keyboardCallbacks.hasKey?.("LEFTBUTTON")) {
      this.keyboardCallbacks.removePhysicalKey?.("LEFTBUTTON");
      this.keyboardCallbacks.onKeyUp("LEFTBUTTON", 0);
    }

    this._isZooming = false;
    this._isPanning = false;
    this._isPanModeActive = false;
    this._wheelAccumulator = 0; // Reset wheel accumulator
  }
}
