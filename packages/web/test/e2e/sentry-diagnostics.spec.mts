import * as path from "@std/path";
import { expect, test } from "../../../../tools/playwright.mts";

type EnvelopePayload = {
  type?: string;
  transaction?: string;
  tags?: Record<string, string>;
  contexts?: Record<string, Record<string, unknown>>;
  exception?: { values?: Array<{ type?: string; value?: string }> };
  spans?: Array<{
    op?: string;
    status?: string;
    data?: Record<string, unknown>;
  }>;
};

test("enriches stackless global rejections and coarse spans without external ingest", async ({ page }) => {
  const payloads: EnvelopePayload[] = [];
  const envelopes: string[] = [];
  await page.route("https://*.ingest.sentry.io/**", async (route) => {
    const envelope = route.request().postData() ?? "";
    envelopes.push(envelope);
    for (const line of envelope.split("\n")) {
      try {
        const payload = JSON.parse(line) as EnvelopePayload;
        if (payload.exception || payload.type === "transaction") payloads.push(payload);
      } catch {
        // Envelope headers and payloads are newline-delimited and not every line is an event.
      }
    }
    await route.fulfill({ status: 200, json: {} });
  });

  const fixturePath = path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "fixtures/sentry-diagnostics.html");
  await page.goto(`/@fs${fixturePath}?query-secret#build-secret`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as Window & { __triggerSentryDiagnosticsTest?: unknown }).__triggerSentryDiagnosticsTest ===
            "function",
      )
    )
    .toBe(true);

  await page.evaluate(() => {
    const trigger = (window as Window & { __triggerSentryDiagnosticsTest?: () => Promise<void> })
      .__triggerSentryDiagnosticsTest;
    if (!trigger) throw new Error("Sentry diagnostics test trigger is not ready");
    return trigger();
  });

  await expect.poll(() => payloads.filter((payload) => payload.exception).length).toBe(1);
  const event = payloads.find((payload) => payload.exception)!;
  expect(event.tags).toMatchObject({
    "pob.capture_path": "global-unhandledrejection",
    "pob.attribution": "unknown",
    "pob.stack_present": "false",
  });
  expect(event.contexts?.["pob.runtime"]).toMatchObject({
    game: "poe2",
    pobVersion: "v0.5.0",
    runId: expect.any(String),
  });
  expect(event.contexts?.["pob.timeline"]).toMatchObject({ events: expect.any(Array) });
  expect(event.contexts?.["pob.dom_exception"]).toEqual({
    name: "AbortError",
    message: "The operation was aborted",
    code: expect.any(Number),
  });

  await expect.poll(() => payloads.filter((payload) => payload.type === "transaction").length).toBeGreaterThanOrEqual(
    2,
  );
  const spans = payloads.flatMap((payload) => payload.spans ?? []);
  const succeeded = spans.find((span) => span.op === "pob.driver.start");
  const failed = spans.find((span) => span.op === "pob.renderer.attach");
  expect(succeeded).toMatchObject({
    op: "pob.driver.start",
    status: "ok",
    data: { "pob.game": "poe2", "pob.version": "v0.5.0" },
  });
  expect(failed).toMatchObject({
    op: "pob.renderer.attach",
    status: expect.not.stringMatching(/^ok$/),
    data: { "pob.game": "poe2", "pob.version": "v0.5.0" },
  });

  const sent = envelopes.join("\n");
  for (
    const secret of [
      "query-secret",
      "build-secret",
      "token-secret",
      "header-secret",
      "body-secret",
      "clipboard-secret",
    ]
  ) {
    expect(sent).not.toContain(secret);
  }
});
