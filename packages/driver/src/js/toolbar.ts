import type { UIState } from "./event";
import type { ModifierKeyManager, ModifierKeys } from "./touch";

export type ToolbarPosition = "top" | "bottom" | "left" | "right";

export interface ToolbarCallbacks {
  onChar: (char: string, doubleClick: number, uiState: UIState) => void;
  onKeyDown: (key: string, doubleClick: number, uiState: UIState) => void;
  onKeyUp: (key: string, doubleClick: number, uiState: UIState) => void;
  onZoomReset: () => void;
  onLayoutChange: (toolbarBounds: DOMRect) => void;
  onFullscreenToggle: () => void;
  onDragModeToggle: (enabled: boolean) => void;
}

export interface ToolbarBounds {
  width: number;
  height: number;
}

export class ResponsiveToolbar {
  private container: HTMLDivElement;
  private position: ToolbarPosition = "bottom";
  private modifierKeyManager: ModifierKeyManager;
  private callbacks: ToolbarCallbacks;
  private keyboardVisible = false;
  private dragModeEnabled = false;

  // Toolbar sections
  private modifierSection!: HTMLDivElement;
  private controlSection!: HTMLDivElement;
  private keyboardSection!: HTMLDivElement;
  private keyboardToggleSection!: HTMLDivElement;
  private mainSection!: HTMLDivElement;

  constructor(parent: HTMLElement, modifierKeyManager: ModifierKeyManager, callbacks: ToolbarCallbacks) {
    this.modifierKeyManager = modifierKeyManager;
    this.callbacks = callbacks;
    this.container = this.createToolbarContainer();
    this.createToolbarSections();
    parent.appendChild(this.container);

    // Set initial position based on screen orientation
    this.updatePosition();

    // Listen for orientation changes
    window.addEventListener("resize", () => this.handleResize());
    window.addEventListener("orientationchange", () => {
      // Delay to allow for orientation change to complete
      setTimeout(() => this.handleOrientationChange(), 100);
    });
  }

  private createToolbarContainer(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      background: rgba(64, 64, 64, 0.95);
      border: 1px solid rgba(96, 96, 96, 0.8);
      padding: 4px;
      z-index: 1000;
      user-select: none;
      -webkit-user-select: none;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    `;
    return container;
  }

  private createToolbarSections() {
    // Create main button section (non-keyboard buttons)
    this.mainSection = document.createElement("div");
    this.mainSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    // Add modifier keys directly to main section
    const modifiers = [
      { key: "ctrl", label: "Ctrl" },
      { key: "shift", label: "Shift" },
      { key: "alt", label: "Alt" },
    ];

    for (const { key, label } of modifiers) {
      const button = this.createModifierButton(key, label);
      this.mainSection.appendChild(button);
    }

    // Add reset zoom button directly to main section
    const resetButton = this.createControlButton("🔄", "Reset Zoom", () => {
      this.callbacks.onZoomReset();
    });
    this.mainSection.appendChild(resetButton);

    // Add fullscreen toggle button directly to main section
    const fullscreenButton = this.createControlButton("⛶", "Toggle Fullscreen", () => {
      this.callbacks.onFullscreenToggle();
    });
    this.mainSection.appendChild(fullscreenButton);

    // Add drag mode toggle button directly to main section
    const dragModeButton = this.createDragModeButton();
    this.mainSection.appendChild(dragModeButton);

    // Add keyboard toggle button directly to main section
    const toggleButton = this.createControlButton("⌨️", "Toggle Keyboard", () => {
      this.toggleKeyboard();
    });
    this.mainSection.appendChild(toggleButton);

    this.container.appendChild(this.mainSection);

    // Keyboard section (initially hidden)
    this.keyboardSection = this.createKeyboardSection();
    this.container.appendChild(this.keyboardSection);
  }

  private createModifierSection(): HTMLDivElement {
    const section = document.createElement("div");
    section.style.cssText = `
      display: flex;
      gap: 2px;
    `;

    const modifiers = [
      { key: "ctrl", label: "Ctrl" },
      { key: "shift", label: "Shift" },
      { key: "alt", label: "Alt" },
    ];

    for (const { key, label } of modifiers) {
      const button = this.createModifierButton(key, label);
      section.appendChild(button);
    }

    return section;
  }

  private createModifierButton(key: string, label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = `
      width: 32px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      font-size: 9px;
      font-weight: bold;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      transition: all 0.15s ease;
      -webkit-user-select: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    let touchProcessed = false;

    const executeAction = () => {
      this.modifierKeyManager.toggleModifier(key as keyof ModifierKeys);
      this.updateModifierButtonState(button, key);
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

    // Mouse events
    button.addEventListener("click", e => {
      if (!touchProcessed) {
        e.preventDefault();
        e.stopPropagation();
        executeAction();
      }
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    this.updateModifierButtonState(button, key);
    return button;
  }

  private updateModifierButtonState(button: HTMLButtonElement, key: string) {
    const active = this.modifierKeyManager.modifiers[key as keyof ModifierKeys];
    if (active) {
      button.style.background = "rgba(0, 123, 255, 0.8)";
      button.style.borderColor = "rgba(0, 123, 255, 1)";
      button.style.transform = "scale(0.95)";
    } else {
      button.style.background = "rgba(255, 255, 255, 0.1)";
      button.style.borderColor = "rgba(255, 255, 255, 0.3)";
      button.style.transform = "scale(1)";
    }
  }

  private createControlSection(): HTMLDivElement {
    const section = document.createElement("div");
    section.style.cssText = `
      display: flex;
      gap: 2px;
    `;

    const resetButton = this.createControlButton("🔄", "Reset Zoom", () => {
      this.callbacks.onZoomReset();
    });

    section.appendChild(resetButton);
    return section;
  }

  private createControlButton(icon: string, tooltip: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = icon;
    button.title = tooltip;
    button.style.cssText = `
      width: 28px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      transition: background 0.15s ease;
      -webkit-user-select: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    let touchProcessed = false;

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
        onClick();
        touchProcessed = false;
      }
    });

    button.addEventListener("touchcancel", e => {
      e.preventDefault();
      setInactiveStyle();
      touchProcessed = false;
    });

    // Mouse events
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
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    return button;
  }

  private createDragModeButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = "🖱️";
    button.title = "Toggle Drag Mode";
    button.style.cssText = `
      width: 28px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      transition: all 0.15s ease;
      -webkit-user-select: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    let touchProcessed = false;

    const executeAction = () => {
      this.dragModeEnabled = !this.dragModeEnabled;
      this.updateDragModeButtonState(button);
      this.callbacks.onDragModeToggle(this.dragModeEnabled);
    };

    const setActiveStyle = () => {
      button.style.background = "rgba(255, 255, 255, 0.3)";
    };

    const setInactiveStyle = () => {
      if (this.dragModeEnabled) {
        button.style.background = "rgba(0, 123, 255, 0.8)";
      } else {
        button.style.background = "rgba(255, 255, 255, 0.1)";
      }
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

    // Mouse events
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
        executeAction();
      }
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    this.updateDragModeButtonState(button);
    return button;
  }

  private updateDragModeButtonState(button: HTMLButtonElement) {
    if (this.dragModeEnabled) {
      button.style.background = "rgba(0, 123, 255, 0.8)";
      button.style.borderColor = "rgba(0, 123, 255, 1)";
      button.style.transform = "scale(0.95)";
    } else {
      button.style.background = "rgba(255, 255, 255, 0.1)";
      button.style.borderColor = "rgba(255, 255, 255, 0.3)";
      button.style.transform = "scale(1)";
    }
  }

  private createKeyboardToggleSection(): HTMLDivElement {
    const section = document.createElement("div");
    section.style.cssText = `
      display: flex;
      gap: 2px;
    `;

    const toggleButton = this.createControlButton("⌨️", "Toggle Keyboard", () => {
      this.toggleKeyboard();
    });

    section.appendChild(toggleButton);
    return section;
  }

  private createKeyboardSection(): HTMLDivElement {
    const section = document.createElement("div");
    section.style.cssText = `
      display: none;
      flex-direction: column;
      gap: 1px;
      padding: 2px;
      background: rgba(48, 48, 48, 0.8);
      border-radius: 3px;
    `;

    // Create compact keyboard - combine into fewer rows
    const keys = [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "↵"],
      ["Z", "X", "C", "V", "Space", "B", "N", "M", ".", ","],
    ];

    for (const row of keys) {
      const rowDiv = document.createElement("div");
      rowDiv.style.cssText = `
        display: flex;
        gap: 1px;
        justify-content: center;
      `;

      for (const key of row) {
        let width = "20px";
        let char = key.toLowerCase();

        if (key === "Space") {
          width = "40px";
          char = " ";
        } else if (key === "⌫") {
          width = "24px";
          char = "\b";
        } else if (key === "↵") {
          width = "24px";
          char = "\r";
        }

        const button = this.createKeyButton(key, char, width);
        rowDiv.appendChild(button);
      }

      section.appendChild(rowDiv);
    }

    return section;
  }

  private createKeyButton(label: string, char?: string, width = "20px"): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label === "Space" ? "␣" : label;
    button.style.cssText = `
      width: ${width};
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      color: white;
      font-size: 9px;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;

    let touchProcessed = false;

    const executeAction = () => {
      const charToSend = char || label.toLowerCase();
      this.callbacks.onChar(charToSend, 0, { x: 0, y: 0, keys: new Set() });

      // Send key events for special keys
      if (label === "⌫" || label === "↵") {
        const keyName = label === "⌫" ? "BACK" : "RETURN";
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

    // Mouse events
    button.addEventListener("click", e => {
      if (!touchProcessed) {
        e.preventDefault();
        e.stopPropagation();
        executeAction();
      }
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    return button;
  }

  private toggleKeyboard() {
    this.keyboardVisible = !this.keyboardVisible;
    this.keyboardSection.style.display = this.keyboardVisible ? "flex" : "none";
    this.updateLayout();
  }

  private updatePosition() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isPortrait = windowHeight > windowWidth;

    this.position = isPortrait ? "bottom" : "right";
    this.updateLayout();
  }

  private updateLayout() {
    const { position } = this;

    // Reset styles
    this.container.style.flexDirection = "";
    this.container.style.maxWidth = "";
    this.container.style.maxHeight = "";
    this.container.style.top = "";
    this.container.style.bottom = "";
    this.container.style.left = "";
    this.container.style.right = "";

    // Update main section flex direction based on position
    if (position === "bottom" || position === "top") {
      // Portrait mode: arrange buttons horizontally
      this.mainSection.style.flexDirection = "row";
      this.mainSection.style.gap = "4px";
    } else {
      // Landscape mode: arrange buttons vertically
      this.mainSection.style.flexDirection = "column";
      this.mainSection.style.gap = "4px";
    }

    // When keyboard is visible, arrange differently
    if (this.keyboardVisible) {
      this.keyboardSection.style.flexDirection = position === "right" || position === "left" ? "column" : "row";
    }

    switch (position) {
      case "bottom":
        this.container.style.cssText += `
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          flex-direction: ${this.keyboardVisible ? "column" : "row"};
          align-items: center;
          justify-content: center;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
        `;
        break;
      case "right":
        this.container.style.cssText += `
          top: 0;
          bottom: 0;
          right: 0;
          height: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 0;
          border-top: none;
          border-right: none;
          border-bottom: none;
        `;
        break;
      case "top":
        this.container.style.cssText += `
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          flex-direction: ${this.keyboardVisible ? "column" : "row"};
          align-items: center;
          justify-content: center;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
        `;
        break;
      case "left":
        this.container.style.cssText += `
          top: 0;
          bottom: 0;
          left: 0;
          height: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 0;
          border-top: none;
          border-left: none;
          border-bottom: none;
        `;
        break;
    }

    // Notify parent about layout change
    const rect = this.container.getBoundingClientRect();
    this.callbacks.onLayoutChange(rect);
  }

  private handleResize() {
    this.updatePosition();
  }

  private handleOrientationChange() {
    this.updatePosition();
  }

  getToolbarBounds(): DOMRect {
    return this.container.getBoundingClientRect();
  }

  setPosition(position: ToolbarPosition) {
    this.position = position;
    this.updateLayout();
  }

  destroy() {
    window.removeEventListener("resize", () => this.handleResize());
    window.removeEventListener("orientationchange", () => this.handleOrientationChange());
    this.container.remove();
  }
}
