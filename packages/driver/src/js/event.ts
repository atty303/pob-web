// This file handles general events that are not keyboard or mouse related

export type VisibilityCallbacks = {
  onVisibilityChange: (visible: boolean) => void;
};

export class EventHandler {
  private handleVisibilityChange: () => void;
  private preventDefault: (e: Event) => void;

  constructor(
    private el: HTMLElement,
    private callbacks: VisibilityCallbacks,
  ) {
    // Bind methods
    this.preventDefault = (e: Event) => e.preventDefault();
    this.handleVisibilityChange = () => {
      this.callbacks.onVisibilityChange(this.el.ownerDocument.visibilityState === "visible");
    };

    // Add event listeners
    el.ownerDocument.addEventListener("visibilitychange", this.handleVisibilityChange);
    el.addEventListener("contextmenu", this.preventDefault);
    el.addEventListener("copy", this.preventDefault);
    el.addEventListener("paste", this.preventDefault);

    // Focus the element
    el.focus();
  }

  destroy() {
    this.el.ownerDocument.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.el.removeEventListener("contextmenu", this.preventDefault);
    this.el.removeEventListener("copy", this.preventDefault);
    this.el.removeEventListener("paste", this.preventDefault);
  }
}

// Re-export types that are used elsewhere
export type { MouseState } from "./mouse-handler";
export type { KeyboardUIState } from "./keyboard-handler";
