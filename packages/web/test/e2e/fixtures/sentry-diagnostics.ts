import * as Sentry from "@sentry/react";
import { RuntimeDiagnostics } from "../../../src/lib/runtime-diagnostics.ts";
import { bindSentryRuntime, initSentry, tracePobOperation } from "../../../src/lib/sentry.ts";

declare global {
  interface Window {
    __triggerSentryDiagnosticsTest?: () => Promise<void>;
  }
}

initSentry();
const diagnostics = new RuntimeDiagnostics("poe2", "v0.5.0", { devTransport: false });
bindSentryRuntime(diagnostics);
diagnostics.record("driver", "start", { build: "release" });
diagnostics.record("worker", "created", { kind: "main" });
diagnostics.record("renderer", "attach", { game: "poe2", pobVersion: "v0.5.0" });
Sentry.addBreadcrumb({
  category: "unsafe-test",
  message: "token-secret",
  data: {
    url: location.href,
    headers: "header-secret",
    body: "body-secret",
    clipboard: "clipboard-secret",
    buildCode: "build-secret",
  },
});
Sentry.setContext("unsafe-test", {
  token: "token-secret",
  headers: "header-secret",
  body: "body-secret",
  clipboard: "clipboard-secret",
  buildCode: "build-secret",
  url: location.href,
});
console.warn("unsafe diagnostic sentinel", "token-secret", "clipboard-secret");

window.__triggerSentryDiagnosticsTest = async () => {
  await tracePobOperation("pob.driver.start", { game: "poe2", pobVersion: "v0.5.0" }, async () => {
    await Promise.resolve();
  });
  await tracePobOperation("pob.renderer.attach", { game: "poe2", pobVersion: "v0.5.0" }, async () => {
    throw new Error("intentional traced failure");
  }).catch(() => {});

  const exception = new DOMException("The operation was aborted", "AbortError");
  Object.defineProperty(exception, "stack", { configurable: true, value: undefined });
  void Promise.reject(exception);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await Sentry.flush(2_000);
};
