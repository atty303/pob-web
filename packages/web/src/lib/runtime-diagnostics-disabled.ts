import type { DriverDiagnostic } from "../../../driver/src/js/diagnostic.ts";

/** Production/test replacement: keeps diagnostics and its transport out of application bundles. */
export class RuntimeDiagnostics {
  readonly runId = "";
  readonly isEnabled = false;

  constructor(_game: string, _pobVersion: string) {}

  record(_phase: string, _event: string, _data?: Record<string, unknown>, _level?: "info" | "error") {}

  driver = (_diagnostic: DriverDiagnostic) => {};

  pageEvent(_event: "pageshow" | "pagehide" | "visibilitychange", _persisted?: boolean) {}

  complete(_reason: string) {}

  snapshot() {
    return { runId: "", complete: true, events: [] };
  }
}
