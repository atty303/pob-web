import type { Event, EventHint } from "@sentry/react";
import type { RuntimeSnapshot } from "./runtime-diagnostics.ts";

type CapturePath = "managed" | "route-boundary" | "global-onerror" | "global-unhandledrejection";

export function enrichSentryEvent(event: Event, hint: EventHint, runtimeSnapshot?: RuntimeSnapshot): Event {
  const capturePath = capturePathForEvent(event);
  const stackPresent = event.exception?.values?.some((exception) => (exception.stacktrace?.frames?.length ?? 0) > 0) ??
    false;
  const runtime = runtimeSnapshot
    ? {
      runId: runtimeSnapshot.runId,
      game: runtimeSnapshot.game,
      pobVersion: runtimeSnapshot.pobVersion,
      phase: runtimeSnapshot.phase,
      lastTransition: runtimeSnapshot.lastTransition,
    }
    : undefined;
  const domException = describeDomException(hint.originalException);

  return {
    ...event,
    tags: {
      ...event.tags,
      "pob.capture_path": capturePath,
      "pob.attribution": capturePath === "managed" || capturePath === "route-boundary" ? "app" : "unknown",
      "pob.stack_present": String(stackPresent),
    },
    contexts: {
      ...event.contexts,
      ...(runtime ? { "pob.runtime": runtime } : {}),
      ...(runtimeSnapshot ? { "pob.timeline": { events: runtimeSnapshot.timeline.slice(-20) } } : {}),
      ...(domException ? { "pob.dom_exception": domException } : {}),
    },
  };
}

export function isReportableRouteException(error: unknown): boolean {
  return !isRouteErrorResponse(error) || error.status !== 404;
}

export function shouldCaptureRouteException(captured: ReadonlySet<unknown>, error: unknown): boolean {
  return !captured.has(error) && isReportableRouteException(error);
}

function isRouteErrorResponse(value: unknown): value is {
  status: number;
  statusText: string;
  internal: boolean;
  data: unknown;
} {
  return !!value && typeof value === "object" && "status" in value && typeof value.status === "number" &&
    "statusText" in value && typeof value.statusText === "string" && "internal" in value &&
    typeof value.internal === "boolean" && "data" in value;
}

function capturePathForEvent(event: Event): CapturePath {
  const explicit = event.tags?.["pob.capture_path"];
  if (isCapturePath(explicit)) return explicit;
  const mechanisms = event.exception?.values?.map((exception) => exception.mechanism?.type) ?? [];
  return mechanisms.some((mechanism) => mechanism?.includes("unhandledrejection"))
    ? "global-unhandledrejection"
    : "global-onerror";
}

function isCapturePath(value: unknown): value is CapturePath {
  return value === "managed" || value === "route-boundary" || value === "global-onerror" ||
    value === "global-unhandledrejection";
}

function describeDomException(value: unknown): { name: string; message: string; code: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (!("name" in value) || typeof value.name !== "string") return undefined;
  if (!("message" in value) || typeof value.message !== "string") return undefined;
  if (!("code" in value) || typeof value.code !== "number") return undefined;
  return { name: value.name, message: value.message, code: value.code };
}
