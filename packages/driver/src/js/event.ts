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
    this.preventDefault = (e: Event) => e.preventDefault();
    this.handleVisibilityChange = () => {
      this.callbacks.onVisibilityChange(this.el.ownerDocument.visibilityState === "visible");
    };

    el.ownerDocument.addEventListener("visibilitychange", this.handleVisibilityChange);
    el.addEventListener("contextmenu", this.preventDefault);
    el.addEventListener("copy", this.preventDefault);
    el.addEventListener("paste", this.preventDefault);

    el.focus();
  }

  destroy() {
    this.el.ownerDocument.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.el.removeEventListener("contextmenu", this.preventDefault);
    this.el.removeEventListener("copy", this.preventDefault);
    this.el.removeEventListener("paste", this.preventDefault);
  }
}

export type { MouseState } from "./mouse-handler";
export type { KeyboardUIState } from "./keyboard-handler";
