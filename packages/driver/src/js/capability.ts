import { markEnvironmentError } from "./error.ts";

type DriverCapabilities = {
  crossOriginIsolated?: boolean;
  SharedArrayBuffer?: unknown;
  WebAssembly?: unknown;
  OffscreenCanvas?: unknown;
};

export function assertDriverCapabilities(capabilities: DriverCapabilities = globalThis) {
  if (!capabilities.crossOriginIsolated || typeof capabilities.SharedArrayBuffer !== "function") {
    throw markEnvironmentError(
      new Error("Path of Building requires cross-origin isolation and SharedArrayBuffer support"),
      "capability",
    );
  }
  if (typeof capabilities.WebAssembly !== "object") {
    throw markEnvironmentError(new Error("Path of Building requires WebAssembly support"), "capability");
  }
  if (typeof capabilities.OffscreenCanvas !== "function") {
    throw markEnvironmentError(new Error("Path of Building requires OffscreenCanvas support"), "capability");
  }
}
