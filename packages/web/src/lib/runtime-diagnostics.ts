import type { DriverDiagnostic } from "../../../driver/src/js/diagnostic.ts";
import { DevelopmentDiagnosticsTransport } from "./runtime-diagnostics-dev.ts";

export const DIAGNOSTIC_SCHEMA_VERSION = 1;
export const DIAGNOSTIC_ENDPOINT = "/__pob_diagnostics";
export const DIAGNOSTIC_MAX_BODY_BYTES = 64 * 1024;
export const DIAGNOSTIC_MAX_BATCH_EVENTS = 128;
const RUNTIME_EVENT_LIMIT = 32;

type RuntimeValue = string | number | boolean | null | readonly string[];

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

export type RuntimeEvent = Omit<RuntimeDiagnosticEvent, "source" | "data"> & {
  data: Readonly<Record<string, RuntimeValue>>;
};

export type RuntimeSnapshot = {
  runId: string;
  game: string;
  pobVersion: string;
  phase: string;
  lastTransition?: { phase: string; at: string; elapsedMs: number };
  timeline: RuntimeEvent[];
};

export type DiagnosticBatch = {
  schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION;
  events: RuntimeDiagnosticEvent[];
};

type RuntimeDiagnosticsOptions = {
  devTransport?: boolean;
  now?: () => number;
  runId?: string;
};

const retainedEvents = new Set([
  "page.mount",
  "page.effect-run",
  "page.previous-run-incomplete",
  "page.pageshow",
  "page.pagehide",
  "page.visibilitychange",
  "driver.construct",
  "driver.constructed",
  "driver.start",
  "driver.started",
  "driver.start-error",
  "driver.reported-error",
  "driver.destroy",
  "driver.cleanup",
  "driver.ready",
  "worker.created",
  "worker.start",
  "worker.error",
  "worker.messageerror",
  "worker.rpc-error",
  "worker.image-load-error",
  "webgl.context-created",
  "webgl.context-lost",
  "webgl.error",
  "build.load",
  "build.loaded",
  "build.error",
  "renderer.attach",
  "renderer.attached",
  "renderer.error",
  "oauth.authorize",
  "oauth.authorized",
  "oauth.error",
  "managed.error",
]);

const projectedFields: Readonly<Record<string, readonly string[]>> = {
  "page.mount": [
    "navigationType",
    "visibility",
    "viewport",
    "devicePixelRatio",
    "crossOriginIsolated",
    "sharedArrayBuffer",
  ],
  "page.effect-run": ["changed"],
  "page.previous-run-incomplete": ["previousRunId"],
  "page.pageshow": ["persisted", "visibility"],
  "page.pagehide": ["persisted", "visibility"],
  "page.visibilitychange": ["visibility"],
  "driver.construct": ["build"],
  "driver.start-error": ["errorName"],
  "driver.reported-error": ["phase", "errorName"],
  "driver.cleanup": ["reason"],
  "worker.created": ["kind"],
  "worker.error": ["kind", "errorName"],
  "worker.messageerror": ["kind"],
  "worker.rpc-error": ["operation", "errorName"],
  "worker.image-load-error": ["errorName"],
  "webgl.context-created": ["contextLost"],
  "build.load": ["game", "pobVersion"],
  "build.loaded": ["game", "pobVersion", "durationMs"],
  "build.error": ["game", "pobVersion", "durationMs", "errorName"],
  "renderer.attach": ["game", "pobVersion"],
  "renderer.attached": ["game", "pobVersion", "durationMs"],
  "renderer.error": ["game", "pobVersion", "durationMs", "errorName"],
  "oauth.authorize": ["game", "pobVersion"],
  "oauth.authorized": ["game", "pobVersion", "durationMs"],
  "oauth.error": ["game", "pobVersion", "durationMs", "errorName"],
  "managed.error": ["phase", "errorName", "errorCode"],
};

export class RuntimeDiagnostics {
  readonly runId: string;
  private seq = 0;
  private timeline: RuntimeEvent[] = [];
  private closed = false;
  private readonly listeners = new Set<(event: RuntimeEvent) => void>();
  private readonly now: () => number;
  private readonly transport: DevelopmentDiagnosticsTransport | undefined;

  constructor(
    private readonly game: string,
    private readonly pobVersion: string,
    options: RuntimeDiagnosticsOptions = {},
  ) {
    this.runId = options.runId ?? crypto.randomUUID();
    this.now = options.now ?? Date.now;
    const devTransport = options.devTransport ?? import.meta.env.MODE === "development";
    this.transport = devTransport ? new DevelopmentDiagnosticsTransport(this.runId) : undefined;
    if (this.transport?.previousRunId) {
      this.record("page", "previous-run-incomplete", { previousRunId: this.transport.previousRunId }, "error");
    }

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const navigation = performance.getEntriesByType("navigation")[0];
      this.record("page", "mount", {
        navigationType: navigation instanceof PerformanceNavigationTiming ? navigation.type : "unknown",
        visibility: document.visibilityState,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        crossOriginIsolated: globalThis.crossOriginIsolated,
        sharedArrayBuffer: typeof SharedArrayBuffer === "function",
      });
    }
  }

  record(
    phase: string,
    event: string,
    data: Record<string, unknown> = {},
    level: "info" | "error" = "info",
  ): void {
    if (this.closed) return;
    const raw: RuntimeDiagnosticEvent = {
      source: "pob-diagnostic",
      runId: this.runId,
      seq: ++this.seq,
      at: new Date(this.now()).toISOString(),
      level,
      phase,
      event,
      game: this.game,
      pobVersion: this.pobVersion,
      data,
    };
    this.transport?.record(raw);

    const projected = projectRuntimeEvent(phase, event, data);
    if (projected === undefined) return;
    const { source: _source, ...runtimeEvent } = raw;
    const projectedEvent: RuntimeEvent = { ...runtimeEvent, data: projected };
    this.timeline.push(projectedEvent);
    this.timeline = this.timeline.slice(-RUNTIME_EVENT_LIMIT);
    for (const listener of this.listeners) {
      try {
        listener(projectedEvent);
      } catch {
        // Observability subscribers must not affect the application operation.
      }
    }
  }

  driver = (diagnostic: DriverDiagnostic): void => {
    this.record(diagnostic.phase, diagnostic.event, diagnostic.data, diagnostic.level);
  };

  pageEvent(event: "pageshow" | "pagehide" | "visibilitychange", persisted?: boolean): void {
    this.record("page", event, {
      persisted,
      visibility: typeof document === "undefined" ? "unknown" : document.visibilityState,
    });
    if (event === "pagehide") this.transport?.beacon();
  }

  complete(reason: string): void {
    if (this.closed) return;
    this.record("driver", "cleanup", { reason });
    this.closed = true;
    this.transport?.complete();
  }

  snapshot(): RuntimeSnapshot {
    const last = this.timeline.at(-1);
    const phase = last ? `${last.phase}.${last.event}` : "idle";
    return {
      runId: this.runId,
      game: this.game,
      pobVersion: this.pobVersion,
      phase,
      ...(last
        ? {
          lastTransition: {
            phase,
            at: last.at,
            elapsedMs: Math.max(0, this.now() - Date.parse(last.at)),
          },
        }
        : {}),
      timeline: [...this.timeline],
    };
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get isEnabled(): boolean {
    return true;
  }
}

export function projectRuntimeEvent(
  phase: string,
  event: string,
  data: Record<string, unknown>,
): Readonly<Record<string, RuntimeValue>> | undefined {
  const key = `${phase}.${event}`;
  if (!retainedEvents.has(key)) return undefined;

  const projected: Record<string, RuntimeValue> = {};
  for (const field of projectedFields[key] ?? []) {
    const value = data[field];
    if (isRuntimeValue(value)) projected[field] = value;
  }
  return projected;
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

function isRuntimeValue(value: unknown): value is RuntimeValue {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
    (Array.isArray(value) && value.every((entry) => typeof entry === "string"));
}
