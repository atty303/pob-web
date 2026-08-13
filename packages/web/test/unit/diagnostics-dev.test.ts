import { assertEquals } from "@std/assert";
import { emitDiagnosticBatch, validateDiagnosticBatch } from "../../diagnostics-dev.ts";
import {
  DIAGNOSTIC_MAX_BATCH_EVENTS,
  DIAGNOSTIC_MAX_BODY_BYTES,
  DIAGNOSTIC_SCHEMA_VERSION,
  type DiagnosticBatch,
  nextDiagnosticBatch,
} from "../../src/lib/runtime-diagnostics.ts";

const event = {
  source: "pob-diagnostic" as const,
  runId: "run-1",
  seq: 1,
  at: "2026-08-13T00:00:00.000Z",
  level: "info" as const,
  phase: "driver",
  event: "start",
  game: "poe1",
  pobVersion: "v2.67.2",
  data: {},
};

Deno.test("development diagnostics accept only the bounded current schema", () => {
  assertEquals(validateDiagnosticBatch({ schemaVersion: DIAGNOSTIC_SCHEMA_VERSION, events: [event] }), {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    events: [event],
  });
  assertEquals(validateDiagnosticBatch({ schemaVersion: 2, events: [event] }), undefined);
  assertEquals(validateDiagnosticBatch({ schemaVersion: DIAGNOSTIC_SCHEMA_VERSION, events: [] }), undefined);
  assertEquals(
    validateDiagnosticBatch({
      schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
      events: [{ ...event, runId: "x".repeat(65) }],
    }),
    undefined,
  );
});

Deno.test("development diagnostics suppress retries and report sequence gaps", () => {
  const lines: string[] = [];
  const lastSequence = new Map<string, number>();
  const batch: DiagnosticBatch = { schemaVersion: DIAGNOSTIC_SCHEMA_VERSION, events: [event] };
  emitDiagnosticBatch(batch, lastSequence, (line) => lines.push(line));
  emitDiagnosticBatch(batch, lastSequence, (line) => lines.push(line));
  emitDiagnosticBatch(
    { ...batch, events: [{ ...event, seq: 3 }] },
    lastSequence,
    (line) => lines.push(line),
  );

  assertEquals(lines.map((line) => JSON.parse(line).event), ["start", "diagnostic-gap", "start"]);
  assertEquals(lastSequence.get("run-1"), 3);
});

Deno.test("client batches stay within the endpoint event and byte limits", () => {
  const events = Array.from({ length: DIAGNOSTIC_MAX_BATCH_EVENTS + 20 }, (_, index) => ({
    ...event,
    seq: index + 1,
    data: { value: "x".repeat(800) },
  }));
  const batch = nextDiagnosticBatch(events);

  assertEquals(batch.events.length <= DIAGNOSTIC_MAX_BATCH_EVENTS, true);
  assertEquals(new TextEncoder().encode(JSON.stringify(batch)).byteLength <= DIAGNOSTIC_MAX_BODY_BYTES, true);
  assertEquals(batch.events.length < events.length, true);
  assertEquals(nextDiagnosticBatch(events.slice(batch.events.length)).events[0]?.seq, batch.events.length + 1);
});

Deno.test("development diagnostics bound per-run deduplication state", () => {
  const lastSequence = new Map<string, number>();
  for (let index = 0; index < 1_100; index++) {
    emitDiagnosticBatch(
      {
        schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
        events: [{ ...event, runId: `run-${index}` }],
      },
      lastSequence,
      () => {},
    );
  }

  assertEquals(lastSequence.size, 1_024);
  assertEquals(lastSequence.has("run-0"), false);
  assertEquals(lastSequence.has("run-1099"), true);
});
