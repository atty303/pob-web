import assert from "node:assert/strict";
import test from "node:test";
import { markEnvironmentError } from "pob-driver/src/js/error";
import {
  collectDiagnosticReport,
  type DiagnosticContext,
  type DiagnosticReport,
  formatDiagnosticReport,
} from "../../src/lib/error-report";

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
  webgpu: false,
};

function record(report: DiagnosticReport) {
  const warnings: DiagnosticReport[] = [];
  const errors: DiagnosticReport[] = [];
  const captures: { error: unknown; context: DiagnosticContext }[] = [];
  collectDiagnosticReport(report, {
    warn: value => warnings.push(value),
    error: value => errors.push(value),
    captureException: (error, diagnosticContext) => captures.push({ error, context: diagnosticContext }),
  });
  return { warnings, errors, captures };
}

test("expected environment failures are logged without creating a Sentry issue", () => {
  const error = markEnvironmentError(new Error("asset unavailable"), "assetLoad");
  const report: DiagnosticReport = { error, environmentCategory: "assetLoad", context };

  const result = record(report);

  assert.deepEqual(result.warnings, [report]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.captures, []);
});

test("unclassified errors are logged and captured without losing their identity or stack", () => {
  const error = new Error("Lua failed");
  const stack = error.stack;
  const report: DiagnosticReport = { error, environmentCategory: undefined, context };

  const result = record(report);

  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, [report]);
  assert.equal(result.captures.length, 1);
  assert.equal(result.captures[0].error, error);
  assert.equal((result.captures[0].error as Error).stack, stack);
  assert.equal(result.captures[0].context, context);
});

test("diagnostic Markdown includes the full URL and safely fences arbitrary errors", () => {
  const error = new Error("bad | value");
  error.stack = "Error: bad | value\n```nested```";
  const report: DiagnosticReport = { error, environmentCategory: undefined, context };

  const markdown = formatDiagnosticReport(report);

  assert.match(markdown, /https:\/\/pob\.cool\/poe2#build=abc\\\|def/);
  assert.match(markdown, /Test Browser<br>Agent/);
  assert.match(markdown, /````text\nError: bad \| value/);
  assert.match(markdown, /```nested```\n````/);
});
