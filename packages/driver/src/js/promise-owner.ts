export class BackgroundPromiseOwner {
  private reported = false;
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly onRejected: (operation: string, error: unknown) => void,
    private readonly reportFirst: (error: unknown) => void,
  ) {}

  dispatch(operation: string, invoke: () => Promise<unknown> | undefined): void {
    let result: Promise<unknown> | undefined;
    try {
      result = invoke();
    } catch (error) {
      result = Promise.reject(error);
    }
    const task = Promise.resolve(result)
      .then(() => undefined)
      .catch((error) => {
        try {
          this.onRejected(operation, error);
        } catch {
          // Observability callbacks must not recreate an unhandled rejection.
        }
        if (!this.reported) {
          this.reported = true;
          try {
            this.reportFirst(error);
          } catch {
            // The owner has no higher async boundary to delegate to.
          }
        }
      });
    this.pending.add(task);
    void task.then(() => this.pending.delete(task));
  }

  async settled(): Promise<void> {
    await Promise.all([...this.pending]);
  }
}

export function enqueueOwnedAction(
  pending: Promise<void>,
  action: () => Promise<void>,
  onRejected: (error: unknown) => void = () => {},
): Promise<void> {
  return pending.then(action, action).catch((error) => {
    try {
      onRejected(error);
    } catch {
      // Keep the queue resolved so later user actions can still run.
    }
  });
}

export function observeOwnedPromise<T>(
  task: Promise<T>,
  onFulfilled: (value: T) => void,
  onRejected: (error: unknown) => void,
): void {
  void task.then(onFulfilled, onRejected).catch(() => {
    // Both terminal observers are allowed to fail without leaking a rejection.
  });
}
