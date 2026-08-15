import * as Sentry from "@sentry/react";
import type { Event } from "@sentry/react";
import { wasmIntegration } from "@sentry/wasm";
import { POB_SENTRY_APPLICATION_KEY } from "../../sentry.config.ts";
import type { DiagnosticSink } from "./error-report.ts";
import { log, tag } from "./logger.ts";
import type { RuntimeDiagnostics, RuntimeEvent, RuntimeSnapshot } from "./runtime-diagnostics.ts";
import { enrichSentryEvent, isReportableRouteException, sanitizeSentryEvent } from "./sentry-event.ts";

export { enrichSentryEvent, isReportableRouteException, shouldCaptureRouteException } from "./sentry-event.ts";

export type PobOperation = "pob.driver.start" | "pob.build.load" | "pob.renderer.attach" | "pob.oauth.authorize";
export type RuntimeSnapshotProvider = () => RuntimeSnapshot;

type WasmIntegration = ReturnType<typeof wasmIntegration>;
type WasmDebugImage = {
  type: "wasm";
  debug_id: string;
  code_id?: string | null;
  code_file: string;
  debug_file?: string | null;
};

const workerIntegration = Sentry.webWorkerIntegration({ worker: [] });
let activeRuntime: { diagnostics: RuntimeDiagnostics; snapshot: RuntimeSnapshotProvider } | undefined;

const emscriptenWasmIntegration: WasmIntegration = {
  name: "EmscriptenWasm",
  processEvent(event) {
    return associateEmscriptenWasmImage(event, getLatestWorkerImage());
  },
};

export const wasmIntegrations = [
  wasmIntegration({ applicationKey: POB_SENTRY_APPLICATION_KEY }),
  workerIntegration,
  emscriptenWasmIntegration,
];

export function initSentry(): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: __SENTRY_RELEASE__,
    integrations: [
      Sentry.browserTracingIntegration(),
      ...wasmIntegrations,
      ...(import.meta.env.PROD
        ? [
          Sentry.thirdPartyErrorFilterIntegration({
            filterKeys: [POB_SENTRY_APPLICATION_KEY],
            behaviour: "apply-tag-if-exclusively-contains-third-party-frames",
          }),
        ]
        : []),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ["localhost", /^https:\/\/pob\.cool\/api/],
    beforeSend: (event, hint) => enrichSentryEvent(event, hint, activeRuntime?.snapshot()) as typeof event,
    beforeSendTransaction: (event) => sanitizeSentryEvent(event) as typeof event,
  });
}

export const sentryDiagnosticSink: DiagnosticSink = {
  warn: (report) => log.warn(tag.pob, "Expected environment error", diagnosticLogSummary(report)),
  error: (report) => log.error(tag.pob, "Path of Building error", diagnosticLogSummary(report)),
  captureException(error, context) {
    Sentry.withScope((scope) => {
      scope.setTag("pob.capture_path", "managed");
      scope.setTag("pob.game", context.game);
      scope.setTag("pob.version", context.pobVersion);
      scope.setTag("pob.error_phase", context.phase);
      Sentry.captureException(error);
    });
  },
};

export function captureRouteException(error: unknown): void {
  if (!isReportableRouteException(error)) return;
  Sentry.withScope((scope) => {
    scope.setTag("pob.capture_path", "route-boundary");
    Sentry.captureException(routeExceptionForCapture(error));
  });
}

export function bindSentryRuntime(diagnostics: RuntimeDiagnostics): () => void {
  const binding = { diagnostics, snapshot: () => diagnostics.snapshot() };
  activeRuntime = binding;
  const unsubscribe = diagnostics.subscribe(addRuntimeBreadcrumb);
  return () => {
    unsubscribe();
    if (activeRuntime === binding) activeRuntime = undefined;
  };
}

export function tracePobOperation<T>(
  operation: PobOperation,
  attributes: { game?: string; pobVersion?: string },
  callback: () => T,
): T {
  return Sentry.startSpan(
    {
      name: operation,
      op: operation,
      attributes: {
        ...(attributes.game ? { "pob.game": attributes.game } : {}),
        ...(attributes.pobVersion ? { "pob.version": attributes.pobVersion } : {}),
      },
    },
    (span) => {
      try {
        const result = callback();
        if (result instanceof Promise) {
          return result.then(
            (value) => {
              span.setStatus({ code: 1 });
              return value;
            },
            (error) => {
              span.setStatus({ code: 2 });
              throw error;
            },
          ) as T;
        }
        span.setStatus({ code: 1 });
        return result;
      } catch (error) {
        span.setStatus({ code: 2 });
        throw error;
      }
    },
  );
}

export function registerSentryWorker(worker: Worker): void {
  workerIntegration.addWorker(worker);
}

export function associateEmscriptenWasmImage(event: Event, image: WasmDebugImage | undefined): Event {
  if (!image) return event;

  const images = event.debug_meta?.images ?? [];
  const imageIndex = images.length;
  let associated = false;
  for (const exception of event.exception?.values ?? []) {
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.platform === "native" && frame.instruction_addr && !frame.addr_mode) {
        frame.addr_mode = `rel:${imageIndex}`;
        associated = true;
      }
    }
  }
  if (associated) event.debug_meta = { ...event.debug_meta, images: [...images, image] };
  return event;
}

function addRuntimeBreadcrumb(event: RuntimeEvent): void {
  Sentry.addBreadcrumb({
    category: "pob.runtime",
    level: event.level,
    message: `${event.phase}.${event.event}`,
    timestamp: Date.parse(event.at) / 1_000,
    data: { ...event.data, game: event.game, pobVersion: event.pobVersion, runId: event.runId },
  });
}

function diagnosticLogSummary(report: Parameters<DiagnosticSink["warn"]>[0]) {
  return {
    classification: report.classification,
    phase: report.context.phase,
    game: report.context.game,
    pobVersion: report.context.pobVersion,
    errorName: report.error instanceof Error && report.error.name ? report.error.name : "Error",
  };
}

function routeExceptionForCapture(error: unknown): unknown {
  if (!error || typeof error !== "object" || !("status" in error) || typeof error.status !== "number") return error;
  const statusText = "statusText" in error && typeof error.statusText === "string" ? error.statusText : "Route error";
  return new Error(`Route failed (${error.status} ${statusText})`);
}

function isWasmDebugImage(value: unknown): value is WasmDebugImage {
  return (
    !!value &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "wasm" &&
    "code_file" in value &&
    typeof value.code_file === "string" &&
    "code_id" in value &&
    typeof value.code_id === "string" &&
    "debug_id" in value &&
    typeof value.debug_id === "string"
  );
}

function getLatestWorkerImage(): WasmDebugImage | undefined {
  const images = (window as typeof window & { _sentryWasmImages?: unknown[] })._sentryWasmImages;
  for (let index = (images?.length ?? 0) - 1; index >= 0; index--) {
    const image = images?.[index];
    if (isWasmDebugImage(image)) return image;
  }
  return undefined;
}
