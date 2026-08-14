import { assertEquals, assertMatch } from "@std/assert";
import { markEnvironmentError, markKnownUpstreamError } from "pob-driver/error";
import {
  collectDiagnosticReport,
  type DiagnosticContext,
  type DiagnosticReport,
  formatDiagnosticReport,
} from "../../src/lib/error-report.ts";

const context: DiagnosticContext = {
  appVersion: "1.2.3",
  game: "poe2",
  pobVersion: "v0.23.1",
  phase: "driver-start",
  url: "https://pob.cool/poe2#build=abc|def",
  userAgent: "Test Browser\nAgent",
  viewport: "1440x900",
  devicePixelRatio: 2,
  crossOriginIsolated: true,
  sharedArrayBuffer: true,
  storageApi: true,
  offscreenCanvas: true,
  webgl2: true,
};

function record(report: DiagnosticReport) {
  const warnings: DiagnosticReport[] = [];
  const errors: DiagnosticReport[] = [];
  const captures: { error: unknown; context: DiagnosticContext }[] = [];
  collectDiagnosticReport(report, {
    warn: (value) => warnings.push(value),
    error: (value) => errors.push(value),
    captureException: (error, diagnosticContext) => captures.push({ error, context: diagnosticContext }),
  });
  return { warnings, errors, captures };
}

Deno.test("expected environment failures are logged without creating a Sentry issue", () => {
  const error = markEnvironmentError(new Error("asset unavailable"), "assetLoad");
  const report: DiagnosticReport = { error, classification: "environment/assetLoad", context };

  const result = record(report);

  assertEquals(result.warnings, [report]);
  assertEquals(result.errors, []);
  assertEquals(result.captures, []);
});

Deno.test("recognized virtual asset environment failures are shown without creating a Sentry issue", () => {
  const error = new Error(
    "Error in lua: LoadModule() error loading 'Classes/ModList.lua': cannot read Classes/ModList.lua: " +
      "Address family not supported by protocol",
  );
  const report: DiagnosticReport = { error, classification: "environment/assetLoad", context };

  const result = record(report);

  assertEquals(result.warnings, [report]);
  assertEquals(result.errors, []);
  assertEquals(result.captures, []);
});

Deno.test("known upstream failures are logged without creating a pob-web Sentry issue", () => {
  const error = markKnownUpstreamError(
    new Error(
      "Error in lua: In download callback: Classes/PoEAPI.lua:188: " +
        "attempt to index local 'response' (a nil value)",
    ),
  );
  const report: DiagnosticReport = { error, classification: "upstream", context };

  const result = record(report);

  assertEquals(result.warnings, [report]);
  assertEquals(result.errors, []);
  assertEquals(result.captures, []);
  assertMatch(formatDiagnosticReport(report), /\| Classification \| upstream \|/);
});

Deno.test("unclassified errors are logged and captured without losing their identity or stack", () => {
  const error = new Error("Lua failed");
  const stack = error.stack;
  const report: DiagnosticReport = { error, classification: "reportable", context };

  const result = record(report);

  assertEquals(result.warnings, []);
  assertEquals(result.errors, [report]);
  assertEquals(result.captures.length, 1);
  assertEquals(result.captures[0].error, error);
  assertEquals((result.captures[0].error as Error).stack, stack);
  assertEquals(result.captures[0].context, context);
});

Deno.test("diagnostic Markdown includes the full URL and safely fences arbitrary errors", () => {
  const error = new Error("bad | value");
  error.stack = "Error: bad | value\n```nested```";
  const report: DiagnosticReport = { error, classification: "reportable", context };

  const markdown = formatDiagnosticReport(report);

  assertMatch(markdown, /https:\/\/pob\.cool\/poe2#build=abc\\\|def/);
  assertMatch(markdown, /Test Browser<br>Agent/);
  assertMatch(markdown, /````text\nError: bad \| value/);
  assertMatch(markdown, /```nested```\n````/);
});
