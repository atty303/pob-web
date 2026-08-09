import path from "node:path";
import { expect, test } from "@playwright/test";

type SentryEvent = {
  debug_meta?: { images?: Array<{ type?: string; code_file?: string }> };
  exception?: {
    values?: Array<{
      stacktrace?: {
        frames?: Array<{ platform?: string; instruction_addr?: string; addr_mode?: string }>;
      };
    }>;
  };
};

test("associates worker WebAssembly frames with their debug image", async ({ page }) => {
  const sentryEvents: SentryEvent[] = [];
  await page.route("https://*.ingest.sentry.io/**", async route => {
    for (const line of route.request().postData()?.split("\n") ?? []) {
      try {
        const payload: unknown = JSON.parse(line);
        if (payload && typeof payload === "object" && "exception" in payload) {
          sentryEvents.push(payload as SentryEvent);
        }
      } catch {
        // Envelope headers and payloads are newline-delimited and not every line is an event.
      }
    }
    await route.fulfill({ status: 200, json: {} });
  });

  const fixturePath = path.resolve(import.meta.dirname, "fixtures/sentry-wasm.html");
  await page.goto(`/@fs${fixturePath}`);
  await expect
    .poll(() =>
      page.evaluate(
        () => typeof (window as Window & { __triggerSentryWasmTest?: unknown }).__triggerSentryWasmTest === "function",
      ),
    )
    .toBe(true);

  const eventId = await page.evaluate(() => {
    const trigger = (window as Window & { __triggerSentryWasmTest?: () => Promise<string> }).__triggerSentryWasmTest;
    if (!trigger) throw new Error("WebAssembly Sentry test trigger is not ready");
    return trigger();
  });
  expect(eventId).toMatch(/^[0-9a-f]{32}$/);

  await expect
    .poll(() =>
      sentryEvents.some(event => {
        const imageIndex =
          event.debug_meta?.images?.findIndex(
            image => image.type === "wasm" && /driver(?:-[^/]+)?\.wasm$/.test(image.code_file ?? ""),
          ) ?? -1;
        if (imageIndex < 0) return false;

        const nativeFrames =
          event.exception?.values
            ?.flatMap(value => value.stacktrace?.frames ?? [])
            .filter(frame => frame.platform === "native" && /^0x[0-9a-f]+$/i.test(frame.instruction_addr ?? "")) ?? [];
        return nativeFrames.length > 0 && nativeFrames.every(frame => frame.addr_mode === `rel:${imageIndex}`);
      }),
    )
    .toBe(true);
});
