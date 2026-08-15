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

type LogPayload = {
  items?: Array<{
    body?: string;
    level?: string;
  }>;
};

test("enriches stackless global rejections and coarse spans without external ingest", async ({ page }) => {
  const payloads: EnvelopePayload[] = [];
  const logs: NonNullable<LogPayload["items"]> = [];
  const envelopes: string[] = [];
  await page.route("https://*.ingest.sentry.io/**", async (route) => {
    const envelope = route.request().postDataBuffer() ?? new Uint8Array();
    envelopes.push(new TextDecoder().decode(envelope));
    try {
      const items = parseEnvelopeItems(envelope);
      for (const [itemHeader, itemPayload] of items) {
        if (!itemPayload || typeof itemPayload !== "object") continue;
        const payload = itemPayload as EnvelopePayload & LogPayload;
        if (payload.exception || payload.type === "transaction") payloads.push(payload);
        if (itemHeader.type === "log" && payload.items) logs.push(...payload.items);
      }
    } catch {
      // Replay recording envelopes can be binary and are not part of these assertions.
    }
    await route.fulfill({ status: 200, json: {} });
  });

  const fixturePath = path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "fixtures/sentry-diagnostics.html");
  await page.goto(`/@fs${fixturePath}?public-query#build=public-build-code`);
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

  await expect.poll(() => {
    const observed = payloads.flatMap((payload) => payload.spans ?? []);
    return observed.some((span) => span.op === "pob.driver.start") &&
      observed.some((span) => span.op === "pob.renderer.attach");
  }).toBe(true);
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

  await expect.poll(() =>
    logs.some((entry) => entry.body === "public console marker public-build-code" && entry.level === "warn")
  ).toBe(true);

  const sent = envelopes.join("\n");
  expect(sent).toContain("public-query");
  expect(sent).toContain("public-build-code");
});

function parseEnvelopeItems(envelope: Uint8Array): Array<[{ type?: string }, unknown]> {
  let offset = 0;
  const decoder = new TextDecoder();

  const readLine = (): unknown => {
    const newline = envelope.indexOf(0x0a, offset);
    const end = newline < 0 ? envelope.length : newline;
    const value = JSON.parse(decoder.decode(envelope.subarray(offset, end)));
    offset = newline < 0 ? end : end + 1;
    return value;
  };

  readLine();
  const items: Array<[{ type?: string }, unknown]> = [];
  while (offset < envelope.length) {
    const header = readLine() as { type?: string; length?: number };
    if (typeof header.length === "number") {
      const payload = envelope.subarray(offset, offset + header.length);
      offset = Math.min(offset + header.length + 1, envelope.length);
      try {
        items.push([header, JSON.parse(decoder.decode(payload))]);
      } catch {
        items.push([header, payload]);
      }
    } else {
      items.push([header, readLine()]);
    }
  }
  return items;
}
