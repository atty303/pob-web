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
    const handleMouseMove = this.handleMouseMove.bind(this);
    const handleMouseDown = this.handleMouseDown.bind(this);
    const handleMouseUp = this.handleMouseUp.bind(this);
    const handleDblClick = this.handleDblClick.bind(this);
    const handleWheel = this.handleWheel.bind(this);
    const handleKeyDown = this.handleKeyDown.bind(this);
    const handleKeyPress = this.handleKeyPress.bind(this);
    const handleKeyUp = this.handleKeyUp.bind(this);

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

    this.destroy = () => {
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
    };

    el.focus();
  }

  private preventDefault(e: Event) {
    e.preventDefault();
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
}
