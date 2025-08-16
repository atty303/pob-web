const DOM_TO_POB_KEY_MAP = new Map<string, string>([
  ["Backspace", "BACK"],
  ["Tab", "TAB"],
  ["Enter", "RETURN"],
  ["Escape", "ESCAPE"],
  ["Space", " "],
  ["Control", "CTRL"],
  ["Shift", "SHIFT"],
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
  private _keys: Set<string> = new Set();
  private _heldKeys: Set<string> = new Set();
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

  get keys(): Set<string> {
    return new Set([...this._keys, ...this._heldKeys]);
  }

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

  private domKeyToPobKey(domKey: string): string {
    if (DOM_TO_POB_KEY_MAP.has(domKey)) {
      return DOM_TO_POB_KEY_MAP.get(domKey)!;
    }
    if (domKey.length === 1) {
      return domKey.toLowerCase();
    }
    return domKey;
  }

  get heldKeys(): Set<string> {
    return new Set(this._heldKeys);
  }

  // Method equivalent to DOM keydown event
  keydown(domKey: string, doubleClick = 0): void {
    const pobKey = this.domKeyToPobKey(domKey);

    this._keys.add(domKey);
    this._callbacks?.onKeyDown(pobKey, doubleClick);

    this.handleSpecialCharacter(domKey, doubleClick);
  }

  virtualKeyPress(domKey: string, isModifier = false, doubleClick = 0): void {
    if (isModifier) {
      if (this._heldKeys.has(domKey)) {
        this._heldKeys.delete(domKey);
        this.keyup(domKey, doubleClick);
      } else {
        this._heldKeys.add(domKey);
        this.keydown(domKey, doubleClick);
      }
      this.notifyChange();
    } else {
      this.keydown(domKey, doubleClick);

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

  keyup(domKey: string, doubleClick = 0): void {
    if (this._keys.has(domKey)) {
      this._keys.delete(domKey);
      const pobKey = this.domKeyToPobKey(domKey);
      this._callbacks?.onKeyUp(pobKey, doubleClick);
    }
  }

  keypress(domKey: string, doubleClick = 0): void {
    this._callbacks?.onChar(domKey, doubleClick);
  }

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
