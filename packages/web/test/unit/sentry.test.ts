import { assertEquals } from "@std/assert";
import type { RuntimeSnapshot } from "../../src/lib/runtime-diagnostics.ts";
import {
  enrichSentryEvent,
  isReportableRouteException,
  shouldCaptureRouteException,
} from "../../src/lib/sentry-event.ts";

const runtime: RuntimeSnapshot = {
  runId: "run-1",
  game: "poe2",
  pobVersion: "v0.5.0",
  phase: "renderer.attach",
  lastTransition: { at: "2026-08-15T00:00:00.000Z", elapsedMs: 25, phase: "renderer.attach" },
  timeline: Array.from({ length: 25 }, (_, index) => ({
    runId: "run-1",
    seq: index + 1,
    at: `2026-08-15T00:00:${String(index).padStart(2, "0")}.000Z`,
    level: "info" as const,
    phase: "driver",
    event: "started",
    game: "poe2",
    pobVersion: "v0.5.0",
    data: {},
  })),
};

Deno.test("Sentry enrichment preserves explicit managed and route capture paths", () => {
  for (const capturePath of ["managed", "route-boundary"] as const) {
    const event = enrichSentryEvent(
      {
        tags: { "pob.capture_path": capturePath },
        exception: { values: [{ stacktrace: { frames: [{ filename: "app.js" }] } }] },
      },
      {},
      runtime,
    );

    assertEquals(event.tags?.["pob.capture_path"], capturePath);
    assertEquals(event.tags?.["pob.attribution"], "app");
    assertEquals(event.tags?.["pob.stack_present"], "true");
  }
});

Deno.test("Sentry enrichment classifies global paths without claiming attribution", () => {
  for (
    const [mechanism, capturePath] of [
      ["onerror", "global-onerror"],
      ["onunhandledrejection", "global-unhandledrejection"],
    ] as const
  ) {
    const event = enrichSentryEvent(
      { exception: { values: [{ mechanism: { type: mechanism } }] } },
      {},
      runtime,
    );

    assertEquals(event.tags?.["pob.capture_path"], capturePath);
    assertEquals(event.tags?.["pob.attribution"], "unknown");
  }
});

Deno.test("stackless DOMException remains unknown and includes only its stable fields", () => {
  const exception = { name: "AbortError", message: "The operation was aborted", code: 20 };
  const event = enrichSentryEvent(
    { exception: { values: [{ mechanism: { type: "onunhandledrejection" } }] } },
    { originalException: exception },
    runtime,
  );

  assertEquals(event.tags, {
    "pob.capture_path": "global-unhandledrejection",
    "pob.attribution": "unknown",
    "pob.stack_present": "false",
  });
  assertEquals(event.contexts?.["pob.dom_exception"], exception);
  assertEquals((event.contexts?.["pob.timeline"] as { events: unknown[] }).events.length, 20);
  assertEquals(event.contexts?.["pob.runtime"], {
    runId: "run-1",
    game: "poe2",
    pobVersion: "v0.5.0",
    phase: "renderer.attach",
    lastTransition: runtime.lastTransition,
  });
});

Deno.test("route error capture excludes only 404 responses", () => {
  assertEquals(isReportableRouteException({ status: 404, statusText: "Not Found", internal: true, data: null }), false);
  assertEquals(isReportableRouteException({ status: 500, statusText: "Failure", internal: true, data: null }), true);
  assertEquals(isReportableRouteException(new Error("route failed")), true);
});

Deno.test("route error capture deduplicates the same error without letting a 404 consume the next error", () => {
  const notFound = { status: 404, statusText: "Not Found", internal: true, data: null };
  const first = { status: 500, statusText: "First failure", internal: true, data: null };
  const second = new Error("second failure");
  const captured = new Set<unknown>();

  assertEquals(shouldCaptureRouteException(captured, notFound), false);
  assertEquals(shouldCaptureRouteException(captured, first), true);
  captured.add(first);
  assertEquals(shouldCaptureRouteException(captured, first), false);
  assertEquals(shouldCaptureRouteException(captured, second), true);
  captured.add(second);
  assertEquals(shouldCaptureRouteException(captured, first), false);
});

Deno.test("Sentry enrichment preserves SDK-collected request, URL, console, and extra data", () => {
  const event = enrichSentryEvent(
    {
      message: "failed at /poe2?public-query#build=public-build-code",
      transaction: "/poe2?public-query#build=public-build-code",
      extra: { buildCode: "public-build-code" },
      request: {
        url: "https://pob.cool/poe2?public-query#build=public-build-code",
        headers: { "x-debug": "request-header" },
        data: "request-body",
        query_string: "public-query",
      },
      breadcrumbs: [
        { category: "console", message: "public console message" },
        { category: "pob.runtime", message: "driver.started" },
      ],
    },
    {},
    runtime,
  );

  assertEquals(event.message, "failed at /poe2?public-query#build=public-build-code");
  assertEquals(event.transaction, "/poe2?public-query#build=public-build-code");
  assertEquals(event.extra, { buildCode: "public-build-code" });
  assertEquals(event.request, {
    url: "https://pob.cool/poe2?public-query#build=public-build-code",
    headers: { "x-debug": "request-header" },
    data: "request-body",
    query_string: "public-query",
  });
  assertEquals(event.breadcrumbs, [
    { category: "console", message: "public console message" },
    { category: "pob.runtime", message: "driver.started" },
  ]);
});
