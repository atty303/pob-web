import { KeyboardState, type KeyboardStateCallbacks } from "./keyboard";

export type KeyboardCallbacks = {
  onKeyDown: (key: string, doubleClick: number, keyboardState: KeyboardUIState) => void;
  onKeyUp: (key: string, doubleClick: number, keyboardState: KeyboardUIState) => void;
  onChar: (char: string, doubleClick: number, keyboardState: KeyboardUIState) => void;
};

export type KeyboardUIState = {
  keys: Set<string>;
};

export class KeyboardHandler {
  readonly keyboardState: KeyboardState;

  get keyboardUIState(): KeyboardUIState {
    return {
      keys: this.keyboardState.keys,
    };
  }

  constructor(
    private el: HTMLElement,
    private callbacks: KeyboardCallbacks,
  ) {
    // Initialize keyboard state with callbacks that delegate to the provided callbacks
    this.keyboardState = new KeyboardState({
      onKeyDown: (key, doubleClick) => callbacks.onKeyDown(key, doubleClick, this.keyboardUIState),
      onKeyUp: (key, doubleClick) => callbacks.onKeyUp(key, doubleClick, this.keyboardUIState),
      onChar: (char, doubleClick) => callbacks.onChar(char, doubleClick, this.keyboardUIState),
    });

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    // Add event listeners
    el.addEventListener("keydown", this.handleKeyDown);
    el.addEventListener("keypress", this.handleKeyPress);
    el.addEventListener("keyup", this.handleKeyUp);
  }

  destroy() {
    this.el.removeEventListener("keydown", this.handleKeyDown);
    this.el.removeEventListener("keypress", this.handleKeyPress);
    this.el.removeEventListener("keyup", this.handleKeyUp);
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
}
