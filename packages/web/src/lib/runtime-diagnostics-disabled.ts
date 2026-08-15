import type { RuntimeDiagnosticEvent } from "./runtime-diagnostics.ts";

/** Production/test replacement for the development-only persistence and network transport. */
export class DevelopmentDiagnosticsTransport {
  readonly previousRunId = undefined;
  constructor(_runId: string) {}
  record(_event: RuntimeDiagnosticEvent): void {}
  complete(): void {}
  beacon(): void {}
}
