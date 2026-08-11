import { type EnvironmentErrorCategory, environmentErrorCategory, isKnownUpstreamError } from "pob-driver/error";
import type { Game } from "pob-game";

export type ErrorPhase = "driver-start" | "build-load" | "renderer-attach" | "driver-runtime";
export type ErrorClassification = "reportable" | "upstream" | `environment/${EnvironmentErrorCategory}`;

export type DiagnosticContext = {
  appVersion: string;
  game: Game;
  pobVersion: string;
  phase: ErrorPhase;
  url: string;
  userAgent: string;
  viewport: string;
  devicePixelRatio: number;
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
  storageApi: boolean;
  offscreenCanvas: boolean;
  webgl2: boolean;
  webgpu: boolean;
};

export type DiagnosticReport = {
  error: unknown;
  classification: ErrorClassification;
  context: DiagnosticContext;
};

export type DiagnosticSink = {
  warn: (report: DiagnosticReport) => void;
  error: (report: DiagnosticReport) => void;
  captureException: (error: unknown, context: DiagnosticContext) => void;
};

export function createDiagnosticReport(input: {
  error: unknown;
  phase: ErrorPhase;
  game: Game;
  pobVersion: string;
}): DiagnosticReport {
  const environmentCategory = environmentErrorCategory(input.error);
  return {
    error: input.error,
    classification: environmentCategory
      ? `environment/${environmentCategory}`
      : isKnownUpstreamError(input.error)
      ? "upstream"
      : "reportable",
    context: {
      appVersion: APP_VERSION,
      game: input.game,
      pobVersion: input.pobVersion,
      phase: input.phase,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      crossOriginIsolated: globalThis.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer === "function",
      storageApi: typeof navigator.storage?.getDirectory === "function",
      offscreenCanvas: typeof OffscreenCanvas === "function",
      webgl2: supportsWebGl2(),
      webgpu: "gpu" in navigator,
    },
  };
}

export function collectDiagnosticReport(report: DiagnosticReport, sink: DiagnosticSink): void {
  if (report.classification !== "reportable") {
    sink.warn(report);
    return;
  }

  sink.error(report);
  sink.captureException(report.error, report.context);
}

export function formatDiagnosticReport(report: DiagnosticReport): string {
  const { name, message, stack } = describeError(report.error);
  const rows: [string, string | number | boolean][] = [
    ["Classification", report.classification],
    ["Phase", report.context.phase],
    ["App version", report.context.appVersion],
    ["Game", report.context.game],
    ["PoB version", report.context.pobVersion],
    ["URL", report.context.url],
    ["User agent", report.context.userAgent],
    ["Viewport", report.context.viewport],
    ["Device pixel ratio", report.context.devicePixelRatio],
    ["Cross-origin isolated", report.context.crossOriginIsolated],
    ["SharedArrayBuffer", report.context.sharedArrayBuffer],
    ["Storage API", report.context.storageApi],
    ["OffscreenCanvas", report.context.offscreenCanvas],
    ["WebGL2", report.context.webgl2],
    ["WebGPU", report.context.webgpu],
  ];
  const table = rows.map(([key, value]) => `| ${escapeTable(key)} | ${escapeTable(String(value))} |`).join("\n");
  const errorText = `${name}: ${message}`;

  return `## Diagnostics

| Field | Value |
| --- | --- |
${table}

<details>
<summary>Error and stack trace</summary>

${codeBlock(stack ? `${errorText}\n\n${stack}` : errorText)}

</details>`;
}

export function describeError(error: unknown): { name: string; message: string; stack: string | undefined } {
  if (error instanceof Error) {
    return { name: error.name || "Error", message: error.message, stack: error.stack };
  }
  return { name: "Thrown value", message: String(error), stack: undefined };
}

function supportsWebGl2(): boolean {
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

function escapeTable(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll("\r", "").replaceAll("\n", "<br>");
}

function codeBlock(value: string): string {
  const longestFence = Math.max(2, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(longestFence + 1);
  return `${fence}text\n${value}\n${fence}`;
}
