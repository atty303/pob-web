import type { UIState } from "./event";
import arrowsPointingInSvg from "./icons/arrows-pointing-in.svg?raw";
import arrowsPointingOutSvg from "./icons/arrows-pointing-out.svg?raw";
import type { ModifierKeyManager, ModifierKeys } from "./touch";

export type ToolbarPosition = "top" | "bottom" | "left" | "right";

export interface ToolbarCallbacks {
  onChar: (char: string, doubleClick: number, uiState: UIState) => void;
  onKeyDown: (key: string, doubleClick: number, uiState: UIState) => void;
  onKeyUp: (key: string, doubleClick: number, uiState: UIState) => void;
  onZoomReset: () => void;
  onLayoutChange: () => void;
  onFullscreenToggle: () => void;
  onDragModeToggle: (enabled: boolean) => void;
}

export interface ToolbarBounds {
  width: number;
  height: number;
}

export class ResponsiveToolbar {
  private container: HTMLDivElement;
  private toolbarElement!: HTMLDivElement;
  private position: ToolbarPosition = "bottom";
  private modifierKeyManager: ModifierKeyManager;
  private callbacks: ToolbarCallbacks;
  private keyboardVisible = false;
  private dragModeEnabled = false;
  private isFullscreen = false;
  private fullscreenButton: HTMLButtonElement | null = null;

  // Toolbar sections
  private keyboardSection!: HTMLDivElement;

  constructor(container: HTMLDivElement, modifierKeyManager: ModifierKeyManager, callbacks: ToolbarCallbacks) {
    this.modifierKeyManager = modifierKeyManager;
    this.callbacks = callbacks;
    this.container = container;
    this.createToolbarElement();
    this.createToolbarButtons();
    // Note: Initial orientation will be set by driver
  }

  private createToolbarElement() {
    this.toolbarElement = document.createElement("div");
    this.toolbarElement.style.cssText = `
      width: 100%;
      height: 100%;
      background: rgba(40, 40, 40, 0.95);
      border: 1px solid rgba(60, 60, 60, 0.8);
      padding: 8px;
      user-select: none;
      -webkit-user-select: none;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      border-radius: 0;
      box-sizing: border-box;
    `;
    this.container.appendChild(this.toolbarElement);
  }

  private createToolbarButtons() {
    // Add modifier keys directly to toolbar element
    const modifiers = [
      { key: "ctrl", label: "Ctrl" },
      { key: "shift", label: "Shift" },
      { key: "alt", label: "Alt" },
    ];

    for (const { key, label } of modifiers) {
      const button = this.createModifierButton(key, label);
      this.toolbarElement.appendChild(button);
    }

    // Add reset zoom button
    const resetButton = this.createControlButton("🔄", "Reset Zoom", () => {
      this.callbacks.onZoomReset();
    });
    this.toolbarElement.appendChild(resetButton);

    // Add fullscreen toggle button
    const fullscreenButton = this.createFullscreenButton();
    this.toolbarElement.appendChild(fullscreenButton);

    // Add drag mode toggle button
    const dragModeButton = this.createDragModeButton();
    this.toolbarElement.appendChild(dragModeButton);

    // Note: Keyboard toggle button and keyboard section are disabled for now
    // const toggleButton = this.createControlButton("⌨️", "Toggle Keyboard", () => {
    //   this.toggleKeyboard();
    // });
    // this.toolbarElement.appendChild(toggleButton);

    // Keyboard section creation is disabled
    // this.keyboardSection = this.createKeyboardSection();
    // this.toolbarElement.appendChild(this.keyboardSection);
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
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      font-size: 13px;
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
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      font-size: 20px;
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

  private createFullscreenButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerHTML = arrowsPointingOutSvg;
    button.title = "Toggle Fullscreen";
    button.style.cssText = `
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      cursor: pointer;
      outline: none;
      touch-action: manipulation;
      transition: background 0.15s ease;
      -webkit-user-select: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    `;

    // Disable pointer events on SVG to ensure click events come from button
    const svg = button.querySelector("svg");
    if (svg) {
      svg.style.width = "24px";
      svg.style.height = "24px";
      svg.style.stroke = "white";
      svg.style.pointerEvents = "none";
      // Disable pointer events on all child elements too
      const paths = svg.querySelectorAll("*");
      for (const el of paths) {
        (el as HTMLElement).style.pointerEvents = "none";
      }
    }

    this.fullscreenButton = button;

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
        this.callbacks.onFullscreenToggle();
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
        this.callbacks.onFullscreenToggle();
      }
      setTimeout(() => {
        touchProcessed = false;
      }, 100);
    });

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenState();
    });

    return button;
  }

  private toggleFullscreenIcon() {
    this.isFullscreen = !!document.fullscreenElement;
    if (this.fullscreenButton) {
      this.fullscreenButton.innerHTML = this.isFullscreen ? arrowsPointingInSvg : arrowsPointingOutSvg;
      this.fullscreenButton.title = this.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen";
      const svg = this.fullscreenButton.querySelector("svg");
      if (svg) {
        svg.style.width = "24px";
        svg.style.height = "24px";
        svg.style.stroke = "white";
        svg.style.pointerEvents = "none";
        // Disable pointer events on all child elements too
        const paths = svg.querySelectorAll("*");
        for (const el of paths) {
          (el as HTMLElement).style.pointerEvents = "none";
        }
      }
    }
  }

  private updateFullscreenState() {
    this.toggleFullscreenIcon();
  }

  private createDragModeButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = "🖱️";
    button.title = "Toggle Drag Mode";
    button.style.cssText = `
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      color: white;
      font-size: 20px;
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
      gap: 2px;
      padding: 3px;
      background: rgba(32, 32, 32, 0.8);
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
        gap: 2px;
        justify-content: center;
      `;

      for (const key of row) {
        let width = "44px";
        let char = key.toLowerCase();

        if (key === "Space") {
          width = "88px";
          char = " ";
        } else if (key === "⌫") {
          width = "44px";
          char = "\b";
        } else if (key === "↵") {
          width = "44px";
          char = "\r";
        }

        const button = this.createKeyButton(key, char, width);
        rowDiv.appendChild(button);
      }

      section.appendChild(rowDiv);
    }

    return section;
  }

  private createKeyButton(label: string, char?: string, width = "44px"): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label === "Space" ? "␣" : label;
    button.style.cssText = `
      width: ${width};
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      color: white;
      font-size: 13px;
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
    // Keyboard functionality is disabled for now
    // this.keyboardVisible = !this.keyboardVisible;
    // this.keyboardSection.style.display = this.keyboardVisible ? "flex" : "none";
    // this.updateLayout();
  }

  updateOrientation(isLandscape: boolean) {
    // Update toolbar element flex direction based on orientation
    if (isLandscape) {
      // Landscape: arrange buttons vertically (to save vertical space)
      this.toolbarElement.style.flexDirection = "column";
      this.toolbarElement.style.alignItems = "center";
      this.toolbarElement.style.justifyContent = "center";
    } else {
      // Portrait: arrange buttons horizontally (to save horizontal space)
      this.toolbarElement.style.flexDirection = "row";
      this.toolbarElement.style.alignItems = "center";
      this.toolbarElement.style.justifyContent = "center";
    }

    // Notify parent about layout change
    this.callbacks.onLayoutChange();
  }

  // External method for updating layout (called by driver)
  updateLayoutFromExternal(position: ToolbarPosition) {
    this.position = position;
    // Note: updateOrientation should be called separately by driver
  }

  setPosition(position: ToolbarPosition) {
    this.position = position;
    // Note: updateOrientation should be called separately by driver
  }

  destroy() {
    // Remove toolbar element from container
    if (this.toolbarElement && this.container.contains(this.toolbarElement)) {
      this.container.removeChild(this.toolbarElement);
    }
  }
}
