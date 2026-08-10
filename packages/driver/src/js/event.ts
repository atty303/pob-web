export type EventCallbacks = {
  onVisibilityChange: (visible: boolean) => void;
  onCopy: () => void;
  onPaste: (text: string) => void;
};

export class EventHandler {
  private handleVisibilityChange: () => void;
  private handleMouseDown: () => void;
  private preventDefault: (e: Event) => void;
  private handleCopy: (e: ClipboardEvent) => void;
  private handlePaste: (e: ClipboardEvent) => void;

  constructor(
    private el: HTMLElement,
    private callbacks: EventCallbacks,
  ) {
    this.preventDefault = (e: Event) => e.preventDefault();
    this.handleVisibilityChange = () => {
      this.callbacks.onVisibilityChange(this.el.ownerDocument.visibilityState === "visible");
    };
    this.handleMouseDown = () => this.el.focus();
    this.handleCopy = (e) => {
      if (!this.el.contains(this.el.ownerDocument.activeElement)) return;
      e.preventDefault();
      this.callbacks.onCopy();
    };
    this.handlePaste = (e) => {
      if (!this.el.contains(this.el.ownerDocument.activeElement)) return;
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain");
      if (text !== undefined) this.callbacks.onPaste(text);
    };

    el.ownerDocument.addEventListener("visibilitychange", this.handleVisibilityChange);
    el.addEventListener("mousedown", this.handleMouseDown);
    el.addEventListener("contextmenu", this.preventDefault);
    el.addEventListener("beforeinput", this.preventDefault);
    el.ownerDocument.addEventListener("copy", this.handleCopy, true);
    el.ownerDocument.addEventListener("paste", this.handlePaste, true);

    el.focus();
  }

  destroy() {
    this.el.ownerDocument.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.el.removeEventListener("mousedown", this.handleMouseDown);
    this.el.removeEventListener("contextmenu", this.preventDefault);
    this.el.removeEventListener("beforeinput", this.preventDefault);
    this.el.ownerDocument.removeEventListener("copy", this.handleCopy, true);
    this.el.ownerDocument.removeEventListener("paste", this.handlePaste, true);
  }
}

export type { MouseState } from "./mouse-handler.ts";
