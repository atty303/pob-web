/** PoB queues discrete input in Lua and reads current key/mouse state on frame.
 * Drain it before replacing that state, even when DOM events outrun browser RAF. */
export class InputFrameBoundary {
  private pending = false;
  private motionPending = false;

  constructor(private readonly onFrame: () => void) {}

  markPending(): void {
    this.pending = true;
  }

  markMotion(): void {
    this.motionPending = true;
  }

  clear(): void {
    this.pending = false;
    this.motionPending = false;
  }

  flush(): void {
    if (!this.pending) return;
    this.clear();
    this.onFrame();
  }

  /** A release must apply the last drag position while its button is still held. */
  flushMotion(): void {
    if (!this.motionPending) return;
    this.clear();
    this.onFrame();
  }
}
