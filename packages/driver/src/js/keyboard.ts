// Key mapping from DOM event names to PoB names
const DOM_TO_POB_KEY_MAP = new Map<string, string>([
  // Special keys
  ["Backspace", "BACK"],
  ["Tab", "TAB"],
  ["Enter", "RETURN"],
  ["Escape", "ESCAPE"],
  ["Space", " "],
  // Modifier keys
  ["Control", "CTRL"],
  ["Shift", "SHIFT"],
  ["Alt", "ALT"],
  // Navigation keys
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
  // Function keys
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
  // Lock keys
  ["NumLock", "NUMLOCK"],
  ["ScrollLock", "SCROLLLOCK"],
  // Mouse buttons
  ["LEFTBUTTON", "LEFTBUTTON"],
  ["MIDDLEBUTTON", "MIDDLEBUTTON"],
  ["RIGHTBUTTON", "RIGHTBUTTON"],
  ["MOUSE4", "MOUSE4"],
  ["MOUSE5", "MOUSE5"],
  ["WHEELUP", "WHEELUP"],
  ["WHEELDOWN", "WHEELDOWN"],
]);

// Special character mappings for PoB
const EXTRA_CHAR_MAP = new Map<string, string>([
  ["Backspace", "\b"],
  ["Tab", "\t"],
  ["Enter", "\r"],
  ["Escape", "\u001B"],
]);

// Transform numbers and symbols when Shift is held
const shiftNumberMap: Record<string, string> = {
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
};

// Additional symbol transformations
const shiftSymbolMap: Record<string, string> = {
  "`": "~",
  "-": "_",
  "=": "+",
  "[": "{",
  "]": "}",
  "\\": "|",
  ";": ":",
  "'": '"',
  ",": "<",
  ".": ">",
  "/": "?",
};

export type KeyboardStateCallbacks = {
  onKeyDown: (key: string, doubleClick: number) => void;
  onKeyUp: (key: string, doubleClick: number) => void;
  onChar: (char: string, doubleClick: number) => void;
};

export type KeyboardStateChangeCallback = () => void;

export class KeyboardState {
  private _keys: Set<string> = new Set(); // DOM event names
  private _heldKeys: Set<string> = new Set(); // DOM event names
  private _callbacks: KeyboardStateCallbacks | undefined;
  private _changeCallbacks: Set<KeyboardStateChangeCallback> = new Set();

  constructor(callbacks?: KeyboardStateCallbacks) {
    this._callbacks = callbacks;
  }

  setCallbacks(callbacks: KeyboardStateCallbacks) {
    this._callbacks = callbacks;
  }

  addChangeListener(callback: KeyboardStateChangeCallback) {
    this._changeCallbacks.add(callback);
  }

  removeChangeListener(callback: KeyboardStateChangeCallback) {
    this._changeCallbacks.delete(callback);
  }

  private notifyChange() {
    for (const callback of this._changeCallbacks) {
      callback();
    }
  }

  // DOM event names for internal state management
  get keys(): Set<string> {
    return new Set([...this._keys, ...this._heldKeys]);
  }

  // PoB-mapped keys for worker communication
  get pobKeys(): Set<string> {
    const pobKeys = new Set<string>();
    for (const domKey of [...this._keys, ...this._heldKeys]) {
      const pobKey = this.domKeyToPobKey(domKey);
      if (pobKey) {
        pobKeys.add(pobKey);
      }
    }
    return pobKeys;
  }

  // Convert DOM event key name to PoB key name
  private domKeyToPobKey(domKey: string): string {
    // Check special mappings first
    if (DOM_TO_POB_KEY_MAP.has(domKey)) {
      return DOM_TO_POB_KEY_MAP.get(domKey)!;
    }
    // Single character keys (a-z, 0-9) map to lowercase
    if (domKey.length === 1) {
      return domKey.toLowerCase();
    }
    // Default: return as-is for unmapped keys
    return domKey;
  }

  get heldKeys(): Set<string> {
    return new Set(this._heldKeys);
  }

  // Method equivalent to DOM keydown event
  keydown(domKey: string, doubleClick = 0): void {
    const pobKey = this.domKeyToPobKey(domKey);

    // Normal key press - add to temporary keys and call down
    this._keys.add(domKey);
    this._callbacks?.onKeyDown(pobKey, doubleClick);

    // Handle special character mappings for keys that generate characters
    // This is needed for PoB character input
    this.handleSpecialCharacter(domKey, doubleClick);
  }

  // Virtual keyboard key press with modifier handling
  virtualKeyPress(domKey: string, isModifier = false, doubleClick = 0): void {
    if (isModifier) {
      // Modifier keys use toggle hold behavior
      if (this._heldKeys.has(domKey)) {
        // Key is already held, release it
        this._heldKeys.delete(domKey);
        this.keyup(domKey, doubleClick);
      } else {
        // Key is not held, hold it
        this._heldKeys.add(domKey);
        this.keydown(domKey, doubleClick);
      }
      this.notifyChange();
    } else {
      // Use same logic as physical keyboard: keydown handles special characters
      this.keydown(domKey, doubleClick);

      // Only add keypress for character-generating keys
      if (domKey.length === 1) {
        const transformedChar = this.applyShiftTransformation(domKey);
        this.keypress(transformedChar);
      }

      this.keyup(domKey, doubleClick);
    }
  }

  private applyShiftTransformation(domKey: string): string {
    const isShiftHeld = this.hasKey("Shift");

    if (!isShiftHeld) {
      return domKey;
    }

    // Transform letters to uppercase when Shift is held
    if (/^[a-z]$/.test(domKey)) {
      return domKey.toUpperCase();
    }

    if (shiftNumberMap[domKey]) {
      return shiftNumberMap[domKey];
    }

    if (shiftSymbolMap[domKey]) {
      return shiftSymbolMap[domKey];
    }

    return domKey;
  }

  private handleSpecialCharacter(domKey: string, doubleClick: number): void {
    // Handle special character mappings
    if (domKey === "Backspace") {
      this._callbacks?.onChar("\b", doubleClick);
    } else if (domKey === "Tab") {
      this._callbacks?.onChar("\t", doubleClick);
    } else if (domKey === "Enter") {
      this._callbacks?.onChar("\r", doubleClick);
    } else if (domKey === "Escape") {
      this._callbacks?.onChar("\u001B", doubleClick);
    } else if (domKey === "Space") {
      this._callbacks?.onChar(" ", doubleClick);
    }
  }

  // Method equivalent to DOM keyup event
  keyup(domKey: string, doubleClick = 0): void {
    if (this._keys.has(domKey)) {
      this._keys.delete(domKey);
      const pobKey = this.domKeyToPobKey(domKey);
      this._callbacks?.onKeyUp(pobKey, doubleClick);
    }
    // Note: held keys are not released by this method
  }

  // Method equivalent to DOM keypress event
  keypress(domKey: string, doubleClick = 0): void {
    // Send the key as-is, matching original DOM keypress behavior
    this._callbacks?.onChar(domKey, doubleClick);
  }

  // Direct key state manipulation for physical keyboard events
  addPhysicalKey(domKey: string): void {
    this._keys.add(domKey);
  }

  removePhysicalKey(domKey: string): void {
    this._keys.delete(domKey);
  }

  hasKey(domKey: string): boolean {
    return this._keys.has(domKey) || this._heldKeys.has(domKey);
  }

  clearAllKeys(): void {
    this._keys.clear();
    this._heldKeys.clear();
  }
}
