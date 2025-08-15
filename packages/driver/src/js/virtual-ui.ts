import type { UIState } from "./event";
import type { ModifierKeyManager, ModifierKeys } from "./touch";

export interface VirtualUICallbacks {
  onChar: (char: string, doubleClick: number, uiState: UIState) => void;
  onKeyDown: (key: string, doubleClick: number, uiState: UIState) => void;
  onKeyUp: (key: string, doubleClick: number, uiState: UIState) => void;
  onZoomReset: () => void;
}

export class VirtualKeyboard {
  private container: HTMLDivElement;
  private isVisible = false;
  private callbacks: VirtualUICallbacks;

  constructor(parent: HTMLElement, callbacks: VirtualUICallbacks) {
    this.callbacks = callbacks;
    this.container = this.createKeyboard();
    parent.appendChild(this.container);
  }

  private createKeyboard(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      padding: 12px;
      display: none;
      z-index: 1000;
      user-select: none;
      font-family: monospace;
      font-size: 14px;
    `;

    // Create keyboard rows
    const rows = [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
      ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
    ];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowDiv = document.createElement("div");
      rowDiv.style.cssText = `
        display: flex;
        justify-content: center;
        margin-bottom: ${rowIndex < rows.length - 1 ? "8px" : "0"};
        gap: 4px;
      `;

      for (const key of row) {
        const button = this.createKeyButton(key);
        rowDiv.appendChild(button);
      }

      container.appendChild(rowDiv);
    }

    // Special keys row
    const specialRow = document.createElement("div");
    specialRow.style.cssText = `
      display: flex;
      justify-content: center;
      margin-top: 8px;
      gap: 8px;
    `;

    const spaceButton = this.createKeyButton("SPACE", " ", "120px");
    const backspaceButton = this.createKeyButton("BACK", "\b", "80px");
    const enterButton = this.createKeyButton("ENTER", "\r", "80px");
    const escButton = this.createKeyButton("ESC", "\u001B", "60px");

    specialRow.appendChild(escButton);
    specialRow.appendChild(backspaceButton);
    specialRow.appendChild(spaceButton);
    specialRow.appendChild(enterButton);

    container.appendChild(specialRow);

    return container;
  }

  private createKeyButton(label: string, char?: string, width = "32px"): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = `
      width: ${width};
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
    `;

    let touchProcessed = false;

    const executeAction = () => {
      const charToSend = char || label.toLowerCase();
      this.callbacks.onChar(charToSend, 0, { x: 0, y: 0, keys: new Set() });

      // Also send key events for special keys
      if (label === "BACK" || label === "ENTER" || label === "ESC") {
        const keyName = label === "BACK" ? "BACK" : label === "ENTER" ? "RETURN" : "ESCAPE";
        this.callbacks.onKeyDown(keyName, 0, { x: 0, y: 0, keys: new Set() });
        setTimeout(() => {
          this.callbacks.onKeyUp(keyName, 0, { x: 0, y: 0, keys: new Set() });
        }, 50);
      }
    };

    const setActiveStyle = () => {
      button.style.background = "rgba(255, 255, 255, 0.3)";
    };

    const setInactiveStyle = () => {
      button.style.background = "rgba(255, 255, 255, 0.1)";
    };

    // Touch events
    button.addEventListener("touchstart", e => {
      e.preventDefault();
      e.stopPropagation();
      touchProcessed = true;
      setActiveStyle();
    });

    button.addEventListener("touchend", e => {
      e.preventDefault();
      e.stopPropagation();
      setInactiveStyle();
      if (touchProcessed) {
        executeAction();
        touchProcessed = false;
      }
    });

    button.addEventListener("touchcancel", e => {
      e.preventDefault();
      setInactiveStyle();
      touchProcessed = false;
    });

    // Mouse events (fallback for desktop)
    button.addEventListener("mousedown", e => {
      if (!touchProcessed) {
        e.preventDefault();
        setActiveStyle();
      }
    });

    button.addEventListener("mouseup", e => {
      if (!touchProcessed) {
        e.preventDefault();
        setInactiveStyle();
      }
    });

    button.addEventListener("mouseleave", () => {
      if (!touchProcessed) {
        setInactiveStyle();
      }
    });

    button.addEventListener("click", e => {
      if (!touchProcessed) {
        e.preventDefault();
        e.stopPropagation();
        executeAction();
      }
      // Reset the flag after a short delay
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    return button;
  }

  show() {
    this.isVisible = true;
    this.container.style.display = "block";
  }

  hide() {
    this.isVisible = false;
    this.container.style.display = "none";
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy() {
    this.container.remove();
  }
}

export class VirtualModifierKeys {
  private container: HTMLDivElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private modifierKeyManager: ModifierKeyManager;

  constructor(parent: HTMLElement, modifierKeyManager: ModifierKeyManager) {
    this.modifierKeyManager = modifierKeyManager;
    this.container = this.createModifierPanel();
    parent.appendChild(this.container);
  }

  private createModifierPanel(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
      user-select: none;
    `;

    // Create modifier buttons
    const modifiers = [
      { key: "ctrl", label: "Ctrl" },
      { key: "shift", label: "Shift" },
      { key: "alt", label: "Alt" },
    ];

    for (const { key, label } of modifiers) {
      const button = this.createModifierButton(key, label);
      this.buttons.set(key, button);
      container.appendChild(button);
    }

    return container;
  }

  private createModifierButton(key: string, label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = `
      width: 60px;
      height: 40px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      transition: all 0.15s ease;
      -webkit-user-select: none;
      user-select: none;
    `;

    let touchProcessed = false;

    const executeAction = () => {
      this.modifierKeyManager.toggleModifier(key as keyof typeof this.modifierKeyManager.modifiers);
      // Update button state immediately
      this.updateButtonState(button, key, this.modifierKeyManager.modifiers[key as keyof ModifierKeys]);
    };

    // Touch events
    button.addEventListener("touchstart", e => {
      e.preventDefault();
      e.stopPropagation();
      touchProcessed = true;
    });

    button.addEventListener("touchend", e => {
      e.preventDefault();
      e.stopPropagation();
      if (touchProcessed) {
        executeAction();
        touchProcessed = false;
      }
    });

    button.addEventListener("touchcancel", e => {
      e.preventDefault();
      touchProcessed = false;
    });

    // Mouse events (fallback for desktop)
    button.addEventListener("click", e => {
      if (!touchProcessed) {
        e.preventDefault();
        e.stopPropagation();
        executeAction();
      }
      // Reset the flag after a short delay
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    // Set initial state
    this.updateButtonState(button, key, false);

    return button;
  }

  private updateButtonState(button: HTMLButtonElement, key: string, active: boolean) {
    if (active) {
      button.style.background = "rgba(0, 123, 255, 0.8)";
      button.style.borderColor = "rgba(0, 123, 255, 1)";
      button.style.transform = "scale(0.95)";
    } else {
      button.style.background = "rgba(0, 0, 0, 0.7)";
      button.style.borderColor = "rgba(255, 255, 255, 0.3)";
      button.style.transform = "scale(1)";
    }
  }

  private updateButtonStates(modifiers: ModifierKeys) {
    this.buttons.forEach((button, key) => {
      const active = modifiers[key as keyof ModifierKeys] || false;
      this.updateButtonState(button, key, active);
    });
  }

  destroy() {
    this.container.remove();
  }
}

export class VirtualControlPanel {
  private container: HTMLDivElement;
  private callbacks: VirtualUICallbacks;

  constructor(parent: HTMLElement, callbacks: VirtualUICallbacks) {
    this.callbacks = callbacks;
    this.container = this.createControlPanel();
    parent.appendChild(this.container);
  }

  private createControlPanel(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
      user-select: none;
    `;

    // Zoom reset button
    const resetButton = this.createControlButton("Reset Zoom", () => {
      this.callbacks.onZoomReset();
    });

    container.appendChild(resetButton);

    return container;
  }

  private createControlButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = `
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      transition: background 0.15s ease;
      -webkit-user-select: none;
      user-select: none;
    `;

    let touchProcessed = false;

    const setActiveStyle = () => {
      button.style.background = "rgba(255, 255, 255, 0.2)";
    };

    const setInactiveStyle = () => {
      button.style.background = "rgba(0, 0, 0, 0.8)";
    };

    // Touch events
    button.addEventListener("touchstart", e => {
      e.preventDefault();
      e.stopPropagation();
      touchProcessed = true;
      setActiveStyle();
    });

    button.addEventListener("touchend", e => {
      e.preventDefault();
      e.stopPropagation();
      setInactiveStyle();
      if (touchProcessed) {
        onClick();
        touchProcessed = false;
      }
    });

    button.addEventListener("touchcancel", e => {
      e.preventDefault();
      setInactiveStyle();
      touchProcessed = false;
    });

    // Mouse events (fallback for desktop)
    button.addEventListener("mousedown", () => {
      if (!touchProcessed) {
        setActiveStyle();
      }
    });

    button.addEventListener("mouseup", () => {
      if (!touchProcessed) {
        setInactiveStyle();
      }
    });

    button.addEventListener("mouseleave", () => {
      if (!touchProcessed) {
        setInactiveStyle();
      }
    });

    button.addEventListener("click", e => {
      if (!touchProcessed) {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }
      // Reset the flag after a short delay
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    return button;
  }

  destroy() {
    this.container.remove();
  }
}

export class VirtualUIManager {
  private keyboard: VirtualKeyboard;
  private modifierKeys: VirtualModifierKeys;
  private controlPanel: VirtualControlPanel;
  private keyboardToggleButton: HTMLButtonElement;

  constructor(parent: HTMLElement, modifierKeyManager: ModifierKeyManager, callbacks: VirtualUICallbacks) {
    this.keyboard = new VirtualKeyboard(parent, callbacks);
    this.modifierKeys = new VirtualModifierKeys(parent, modifierKeyManager);
    this.controlPanel = new VirtualControlPanel(parent, callbacks);
    this.keyboardToggleButton = this.createKeyboardToggle(parent);
  }

  private createKeyboardToggle(parent: HTMLElement): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = "⌨️";
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      color: white;
      font-size: 20px;
      cursor: pointer;
      outline: none;
      z-index: 1001;
      touch-action: manipulation;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-user-select: none;
      user-select: none;
    `;

    let touchProcessed = false;

    const executeAction = () => {
      this.keyboard.toggle();
    };

    // Touch events
    button.addEventListener("touchstart", e => {
      e.preventDefault();
      e.stopPropagation();
      touchProcessed = true;
    });

    button.addEventListener("touchend", e => {
      e.preventDefault();
      e.stopPropagation();
      if (touchProcessed) {
        executeAction();
        touchProcessed = false;
      }
    });

    button.addEventListener("touchcancel", e => {
      e.preventDefault();
      touchProcessed = false;
    });

    // Mouse events (fallback for desktop)
    button.addEventListener("click", e => {
      if (!touchProcessed) {
        e.preventDefault();
        e.stopPropagation();
        executeAction();
      }
      // Reset the flag after a short delay
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    parent.appendChild(button);
    return button;
  }

  destroy() {
    this.keyboard.destroy();
    this.modifierKeys.destroy();
    this.controlPanel.destroy();
    this.keyboardToggleButton.remove();
  }
}
