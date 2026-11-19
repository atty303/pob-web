/** Backpressure for replaceable input, with explicit ordering barriers.
 * submit must send synchronously and own its error reporting. */
export class LatestValueDispatcher<T> {
  private pending: { value: T } | undefined;
  private inFlight = 0;
  private closed = false;

  constructor(private readonly submit: (value: T) => Promise<unknown>) {}

  push(value: T): void {
    if (this.closed) return;
    this.pending = { value };
    if (this.inFlight === 0) this.flushPending();
  }

  /** Send the current position BEFORE a click/key/resize is posted. Such
   * barriers may add an in-flight send; free motion alone keeps at most one. */
  flushPending(): void {
    if (this.closed || !this.pending) return;
    const { value } = this.pending;
    this.pending = undefined;
    this.inFlight++;
    const complete = () => {
      this.inFlight--;
      if (this.inFlight === 0) this.flushPending();
    };
    try {
      // Do not defer submit to a microtask: later discrete input must follow it
      // on the worker's message port, with its original cursor/key snapshot.
      void this.submit(value).then(complete, complete);
    } catch (error) {
      complete();
      throw error;
    }
  }

  discardPending(): void {
    this.pending = undefined;
  }

  close(): void {
    this.closed = true;
    this.discardPending();
  }
}
