import type { DriverDiagnostic } from "../../../driver/src/js/diagnostic.ts";

export const DIAGNOSTIC_SCHEMA_VERSION = 1;
export const DIAGNOSTIC_ENDPOINT = "/__pob_diagnostics";
const STORAGE_KEY = "pob-diagnostic-snapshot";
const MAX_EVENTS = 256;
const MAX_BYTES = 128 * 1024;
export const DIAGNOSTIC_MAX_BODY_BYTES = 64 * 1024;
export const DIAGNOSTIC_MAX_BATCH_EVENTS = 128;
const FLUSH_INTERVAL_MS = 750;

export type RuntimeDiagnosticEvent = {
  source: "pob-diagnostic";
  runId: string;
  seq: number;
  at: string;
  level: "info" | "error";
  phase: string;
  event: string;
  game: string;
  pobVersion: string;
  data: Record<string, unknown>;
};

export type DiagnosticBatch = {
  schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION;
  events: RuntimeDiagnosticEvent[];
};

type Snapshot = {
  runId: string;
  complete: boolean;
  events: RuntimeDiagnosticEvent[];
};

export class RuntimeDiagnostics {
  readonly runId = crypto.randomUUID();
  private seq = 0;
  private events: RuntimeDiagnosticEvent[] = [];
  private pending: RuntimeDiagnosticEvent[] = [];
  private timer: number | undefined;
  private sending = false;
  private closed = false;
  private readonly enabled: boolean;

  constructor(
    private readonly game: string,
    private readonly pobVersion: string,
    options: { enabled?: boolean } = {},
  ) {
    this.enabled = options.enabled ?? import.meta.env.MODE === "development";
    if (!this.enabled) return;

    const previous = readSnapshot();
    if (previous && !previous.complete) {
      this.record(
        "page",
        "previous-run-incomplete",
        { previousRunId: previous.runId, last: previous.events.at(-1) },
        "error",
      );
    }
    this.record("page", "mount", {
      navigationType: performance.getEntriesByType("navigation")[0] instanceof PerformanceNavigationTiming
        ? (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type
        : "unknown",
      visibility: document.visibilityState,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      crossOriginIsolated: globalThis.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer === "function",
    });
    this.timer = window.setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    window.__POB_DIAGNOSTICS__ = { runId: this.runId, snapshot: () => this.snapshot() };
  }

  record(
    phase: string,
    event: string,
    data: Record<string, unknown> = {},
    level: "info" | "error" = "info",
  ) {
    if (!this.enabled || this.closed) return;
    const entry: RuntimeDiagnosticEvent = {
      source: "pob-diagnostic",
      runId: this.runId,
      seq: ++this.seq,
      at: new Date().toISOString(),
      level,
      phase,
      event,
      game: this.game,
      pobVersion: this.pobVersion,
      data: sanitize(data),
    };
    this.events.push(entry);
    this.pending.push(entry);
    this.trim();
    this.persist(false);
    if (level === "error" || isUrgent(phase, event)) void this.flush();
  }

  driver = (diagnostic: DriverDiagnostic) => {
    this.record(diagnostic.phase, diagnostic.event, diagnostic.data, diagnostic.level);
  };

  pageEvent(event: "pageshow" | "pagehide" | "visibilitychange", persisted?: boolean) {
    this.record("page", event, { persisted, visibility: document.visibilityState });
    if (event === "pagehide") this.beacon();
  }

  complete(reason: string) {
    if (!this.enabled || this.closed) return;
    this.record("driver", "cleanup", { reason });
    this.closed = true;
    this.persist(true);
    this.beacon();
    if (this.timer !== undefined) window.clearInterval(this.timer);
    if (window.__POB_DIAGNOSTICS__?.runId === this.runId) delete window.__POB_DIAGNOSTICS__;
  }

  snapshot(): Snapshot {
    return { runId: this.runId, complete: this.closed, events: [...this.events] };
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async flush() {
    if (!this.enabled || this.sending || this.pending.length === 0) return;
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

  private beacon() {
    if (!this.enabled || this.pending.length === 0) return;
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

  private trim() {
    while (this.events.length > MAX_EVENTS || JSON.stringify(this.events).length > MAX_BYTES) this.events.shift();
    const firstSeq = this.events[0]?.seq ?? this.seq + 1;
    this.pending = this.pending.filter((event) => event.seq >= firstSeq);
  }

  private persist(complete: boolean) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ runId: this.runId, complete, events: this.events } satisfies Snapshot),
      );
    } catch {
      // Diagnostics must never interfere with the application lifecycle.
    }
  }
}

export function nextDiagnosticBatch(events: RuntimeDiagnosticEvent[]): DiagnosticBatch {
  const selected: RuntimeDiagnosticEvent[] = [];
  for (const event of events.slice(0, DIAGNOSTIC_MAX_BATCH_EVENTS)) {
    const candidate = {
      schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
      events: [...selected, event],
    } satisfies DiagnosticBatch;
    if (new TextEncoder().encode(JSON.stringify(candidate)).byteLength > DIAGNOSTIC_MAX_BODY_BYTES) break;
    selected.push(event);
  }
  return { schemaVersion: DIAGNOSTIC_SCHEMA_VERSION, events: selected };
}

function readSnapshot(): Snapshot | undefined {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as Snapshot : undefined;
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
