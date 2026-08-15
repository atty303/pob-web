import { assertEquals } from "@std/assert";
import type { RuntimeSnapshot } from "../../src/lib/runtime-diagnostics.ts";
import {
  enrichSentryEvent,
  isReportableRouteException,
  sanitizeSentryEvent,
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

Deno.test("Sentry events remove request payloads and URL details from transactions and spans", () => {
  const event = sanitizeSentryEvent({
    message: "failed at /poe2?query-secret#build-secret",
    transaction: "/poe2?query-secret#build-secret",
    extra: { token: "token-secret" },
    request: {
      url: "https://pob.cool/poe2?query-secret#build-secret",
      headers: { authorization: "token-secret" },
      data: "body-secret",
      cookies: { session: "cookie-secret" },
      query_string: "query-secret",
    },
    contexts: {
      trace: {
        trace_id: "00000000000000000000000000000000",
        span_id: "0000000000000000",
        "url.full": "https://pob.cool/poe2?query-secret#build-secret",
        token: "token-secret",
        buildCode: "build-secret",
      },
    },
    breadcrumbs: [
      { category: "console", message: "token-secret" },
      { category: "pob.runtime", message: "driver.started" },
    ],
    exception: {
      values: [{
        value: "failed at https://pob.cool/poe2?query-secret#build-secret",
        stacktrace: {
          frames: [{
            filename: "https://pob.cool/app.js?query-secret#build-secret",
            abs_path: "https://pob.cool/app.js?query-secret#build-secret",
          }],
        },
      }],
    },
    spans: [{
      trace_id: "00000000000000000000000000000000",
      span_id: "0000000000000000",
      start_timestamp: 0,
      timestamp: 1,
      description: "GET /api/build?query-secret#build-secret",
      data: {
        "url.full": "https://pob.cool/api/build?query-secret#build-secret",
        "http.request.header.authorization": "token-secret",
        body: "body-secret",
      },
    }],
  });

  assertEquals(event.message, "failed at /poe2");
  assertEquals(event.transaction, "/poe2");
  assertEquals(event.extra, undefined);
  assertEquals(event.request, {
    url: "https://pob.cool/poe2",
    headers: undefined,
    data: undefined,
    cookies: undefined,
    query_string: undefined,
  });
  assertEquals(event.contexts, {
    trace: {
      trace_id: "00000000000000000000000000000000",
      span_id: "0000000000000000",
      "url.full": "https://pob.cool/poe2",
    },
  });
  assertEquals(event.spans?.[0].description, "GET /api/build");
  assertEquals(event.spans?.[0].data, { "url.full": "https://pob.cool/api/build" });
  assertEquals(event.breadcrumbs, [{ category: "pob.runtime", message: "driver.started" }]);
  assertEquals(event.exception?.values?.[0].value, "failed at https://pob.cool/poe2");
  assertEquals(event.exception?.values?.[0].stacktrace?.frames, [{
    filename: "https://pob.cool/app.js",
    abs_path: "https://pob.cool/app.js",
  }]);
});

Deno.test("Sentry enrichment keeps only projected runtime breadcrumbs", () => {
  const event = enrichSentryEvent(
    {
      breadcrumbs: [
        { category: "console", message: "token-secret" },
        { category: "pob.runtime", message: "driver.started", data: { operation: "start" } },
      ],
    },
    {},
    runtime,
  );
  assertEquals(event.breadcrumbs, [
    { category: "pob.runtime", message: "driver.started", data: { operation: "start" } },
  ]);
});
