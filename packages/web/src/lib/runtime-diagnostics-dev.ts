import { DIAGNOSTIC_ENDPOINT, nextDiagnosticBatch, type RuntimeDiagnosticEvent } from "./runtime-diagnostics.ts";

const STORAGE_KEY = "pob-diagnostic-snapshot";
const MAX_EVENTS = 256;
const MAX_BYTES = 128 * 1024;
const FLUSH_INTERVAL_MS = 750;

type DevSnapshot = {
  runId: string;
  complete: boolean;
  events: RuntimeDiagnosticEvent[];
};

export class DevelopmentDiagnosticsTransport {
  readonly previousRunId: string | undefined;
  private events: RuntimeDiagnosticEvent[] = [];
  private pending: RuntimeDiagnosticEvent[] = [];
  private timer: number | undefined;
  private sending = false;
  private closed = false;

  constructor(private readonly runId: string) {
    const previous = readSnapshot();
    this.previousRunId = previous && !previous.complete ? previous.runId : undefined;
    this.timer = window.setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    window.__POB_DIAGNOSTICS__ = { runId: this.runId, snapshot: () => this.snapshot() };
  }

  record(event: RuntimeDiagnosticEvent): void {
    if (this.closed) return;
    const entry = { ...event, data: sanitize(event.data) };
    this.events.push(entry);
    this.pending.push(entry);
    this.trim();
    this.persist(false);
    if (entry.level === "error" || isUrgent(entry.phase, entry.event)) void this.flush();
  }

  complete(): void {
    if (this.closed) return;
    this.persist(true);
    this.beacon();
    this.closed = true;
    if (this.timer !== undefined) window.clearInterval(this.timer);
    if (window.__POB_DIAGNOSTICS__?.runId === this.runId) delete window.__POB_DIAGNOSTICS__;
  }

  snapshot(): DevSnapshot {
    return { runId: this.runId, complete: this.closed, events: [...this.events] };
  }

  async flush(): Promise<void> {
    if (this.closed || this.sending || this.pending.length === 0) return;
    this.sending = true;
    try {
      while (this.pending.length > 0) {
        const batch = nextDiagnosticBatch(this.pending);
        if (batch.events.length === 0) break;
        const response = await fetch(DIAGNOSTIC_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(batch),
          keepalive: true,
        });
        if (!response.ok) break;
        this.pending.splice(0, batch.events.length);
      }
    } catch {
      // The retained batch is retried on the next interval.
    } finally {
      this.sending = false;
    }
  }

  beacon(): void {
    if (this.pending.length === 0) return;
    while (this.pending.length > 0) {
      const batch = nextDiagnosticBatch(this.pending);
      if (batch.events.length === 0) return;
      const body = JSON.stringify(batch);
      if (!navigator.sendBeacon?.(DIAGNOSTIC_ENDPOINT, new Blob([body], { type: "application/json" }))) {
        void this.flush();
        return;
      }
      this.pending.splice(0, batch.events.length);
    }
  }

  private trim(): void {
    while (this.events.length > MAX_EVENTS || JSON.stringify(this.events).length > MAX_BYTES) this.events.shift();
    const firstSeq = this.events[0]?.seq ?? 0;
    this.pending = this.pending.filter((event) => event.seq >= firstSeq);
  }

  private persist(complete: boolean): void {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ runId: this.runId, complete, events: this.events } satisfies DevSnapshot),
      );
    } catch {
      // Diagnostics must never interfere with the application lifecycle.
    }
  }
}

function readSnapshot(): DevSnapshot | undefined {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as DevSnapshot : undefined;
  } catch {
    return undefined;
  }
}

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const serialized = JSON.stringify(data, (_key, value) => value instanceof Error ? String(value) : value);
  if (new TextEncoder().encode(serialized).byteLength > 8 * 1024) {
    return { truncated: true, serializedBytes: new TextEncoder().encode(serialized).byteLength };
  }
  return JSON.parse(serialized) as Record<string, unknown>;
}

function isUrgent(phase: string, event: string): boolean {
  return phase === "worker" || phase === "webgl" || event === "cleanup" || event === "pagehide" ||
    event === "visibilitychange";
}
