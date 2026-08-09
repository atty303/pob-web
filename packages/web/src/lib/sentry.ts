import * as Sentry from "@sentry/react";
import { wasmIntegration } from "@sentry/wasm";

type WasmIntegration = ReturnType<typeof wasmIntegration>;
type SentryEvent = Parameters<NonNullable<WasmIntegration["processEvent"]>>[0];
type WasmDebugImage = {
  type: "wasm";
  debug_id: string;
  code_id?: string | null;
  code_file: string;
  debug_file?: string | null;
};

const workerIntegration = Sentry.webWorkerIntegration({ worker: [] });

const emscriptenWasmIntegration: WasmIntegration = {
  name: "EmscriptenWasm",
  processEvent(event) {
    return associateEmscriptenWasmImage(event, getLatestWorkerImage());
  },
};

export const wasmIntegrations = [wasmIntegration(), workerIntegration, emscriptenWasmIntegration];

export function registerSentryWorker(worker: Worker): void {
  workerIntegration.addWorker(worker);
}

export function associateEmscriptenWasmImage(event: SentryEvent, image: WasmDebugImage | undefined): SentryEvent {
  if (!image) return event;

  const images = event.debug_meta?.images ?? [];
  const imageIndex = images.length;
  let associated = false;
  for (const exception of event.exception?.values ?? []) {
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.platform === "native" && frame.instruction_addr && frame.filename?.startsWith("wasm://wasm/")) {
        frame.addr_mode = `rel:${imageIndex}`;
        associated = true;
      }
    }
  }
  if (associated) {
    event.debug_meta = { ...event.debug_meta, images: [...images, image] };
  }
  return event;
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
