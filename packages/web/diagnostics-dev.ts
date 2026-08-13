import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  DIAGNOSTIC_MAX_BATCH_EVENTS,
  DIAGNOSTIC_MAX_BODY_BYTES,
  DIAGNOSTIC_SCHEMA_VERSION,
  type DiagnosticBatch,
  type RuntimeDiagnosticEvent,
} from "./src/lib/runtime-diagnostics.ts";

const DIAGNOSTIC_MAX_TRACKED_RUNS = 1024;

export function validateDiagnosticBatch(value: unknown): DiagnosticBatch | undefined {
  if (!value || typeof value !== "object") return undefined;
  const batch = value as Partial<DiagnosticBatch>;
  if (batch.schemaVersion !== DIAGNOSTIC_SCHEMA_VERSION || !Array.isArray(batch.events)) return undefined;
  if (batch.events.length === 0 || batch.events.length > DIAGNOSTIC_MAX_BATCH_EVENTS) return undefined;
  if (!batch.events.every(isDiagnosticEvent)) return undefined;
  return batch as DiagnosticBatch;
}

export function diagnosticsDevPlugin(sink: (line: string) => void = (line) => console.error(line)): Plugin {
  const lastSequence = new Map<string, number>();
  return {
    name: "pob-runtime-diagnostics",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__pob_diagnostics", async (request, response) => {
        if (request.method !== "POST") return reject(response, 405, "method-not-allowed", sink);
        if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
          return reject(response, 415, "invalid-content-type", sink);
        }
        const body = await readBody(request, DIAGNOSTIC_MAX_BODY_BYTES);
        if (!body) return reject(response, 413, "invalid-or-oversized-body", sink);
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          return reject(response, 400, "invalid-json", sink);
        }
        const batch = validateDiagnosticBatch(parsed);
        if (!batch) return reject(response, 400, "invalid-schema", sink);

        emitDiagnosticBatch(batch, lastSequence, sink);
        response.statusCode = 204;
        response.end();
      });
    },
  };
}

export function emitDiagnosticBatch(
  batch: DiagnosticBatch,
  lastSequence: Map<string, number>,
  sink: (line: string) => void,
) {
  for (const event of batch.events) {
    const previous = lastSequence.get(event.runId) ?? 0;
    if (event.seq <= previous) continue;
    if (event.seq > previous + 1) {
      sink(JSON.stringify({
        source: "pob-diagnostic",
        runId: event.runId,
        seq: event.seq,
        level: "error",
        phase: "transport",
        event: "diagnostic-gap",
        data: { expected: previous + 1, received: event.seq },
      }));
    }
    sink(JSON.stringify(event));
    lastSequence.delete(event.runId);
    lastSequence.set(event.runId, event.seq);
    while (lastSequence.size > DIAGNOSTIC_MAX_TRACKED_RUNS) {
      const oldestRunId = lastSequence.keys().next().value;
      if (oldestRunId === undefined) break;
      lastSequence.delete(oldestRunId);
    }
  }
}

function isDiagnosticEvent(value: unknown): value is RuntimeDiagnosticEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RuntimeDiagnosticEvent>;
  return event.source === "pob-diagnostic" && typeof event.runId === "string" && event.runId.length <= 64 &&
    Number.isSafeInteger(event.seq) && (event.seq ?? 0) > 0 && typeof event.at === "string" &&
    (event.level === "info" || event.level === "error") && typeof event.phase === "string" &&
    typeof event.event === "string" && typeof event.game === "string" && typeof event.pobVersion === "string" &&
    !!event.data && typeof event.data === "object" && !Array.isArray(event.data);
}

async function readBody(request: IncomingMessage, limit: number): Promise<string | undefined> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    size += bytes.byteLength;
    if (size > limit) return undefined;
    chunks.push(bytes);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function reject(response: ServerResponse, status: number, reason: string, sink: (line: string) => void) {
  sink(JSON.stringify({ source: "pob-diagnostic-server", level: "error", event: "rejected", reason }));
  response.statusCode = status;
  response.end();
}
