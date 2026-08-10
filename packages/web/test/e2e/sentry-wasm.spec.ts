import path from "node:path";
import { expect, test } from "../../../../tools/playwright";

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

type SymbolicatedFrame = {
  absPath?: string;
  filename?: string;
  function?: string;
  lineNo?: number;
};

type SentryApiEvent = {
  entries?: Array<{
    type?: string;
    data?: {
      values?: Array<{ stacktrace?: { frames?: SymbolicatedFrame[] } }>;
    };
  }>;
};

const liveSentry = process.env.SENTRY_LIVE_TEST === "1";

const symbolicatedWasmFrames = (event: SentryApiEvent): SymbolicatedFrame[] =>
  event.entries
    ?.filter(entry => entry.type === "exception")
    .flatMap(entry => entry.data?.values ?? [])
    .flatMap(value => value.stacktrace?.frames ?? [])
    .filter(frame => /(?:^|\/)driver\.c$/.test(frame.filename ?? frame.absPath ?? "")) ?? [];

const waitForSymbolication = async (eventId: string): Promise<SymbolicatedFrame[]> => {
  const token = process.env.SENTRY_LIVE_AUTH_TOKEN;
  if (!token) throw new Error("SENTRY_LIVE_AUTH_TOKEN must be able to read events from the Sentry project");

  const org = process.env.SENTRY_LIVE_ORG ?? "atty303";
  const project = process.env.SENTRY_LIVE_PROJECT ?? "pob-web";
  const endpoint = `https://sentry.io/api/0/projects/${org}/${project}/events/${eventId}/`;
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 404) {
      await new Promise(resolve => setTimeout(resolve, 1_000));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Sentry event API returned ${response.status}; check SENTRY_LIVE_AUTH_TOKEN project access`);
    }

    const frames = symbolicatedWasmFrames((await response.json()) as SentryApiEvent);
    const functions = new Set(frames.map(frame => frame.function));
    if (functions.has("sentry_test_crash") && functions.has("sentry_test_trap")) return frames;
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }

  throw new Error(`Sentry did not symbolize event ${eventId} to the driver.c test frames within 90 seconds`);
};

test("associates worker WebAssembly frames with their debug image", async ({ page }) => {
  test.setTimeout(liveSentry ? 150_000 : 60_000);
  const sentryEvents: SentryEvent[] = [];
  if (!liveSentry) {
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
  }

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

  if (liveSentry) {
    const frames = await waitForSymbolication(eventId);
    expect(frames.find(frame => frame.function === "sentry_test_crash")?.lineNo).toBeGreaterThan(0);
    expect(frames.find(frame => frame.function === "sentry_test_trap")?.lineNo).toBeGreaterThan(0);
    return;
  }

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
