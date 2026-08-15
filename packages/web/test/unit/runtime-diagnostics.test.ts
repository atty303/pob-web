import { assertEquals } from "@std/assert";
import {
  projectRuntimeEvent,
  type RuntimeDiagnosticEvent,
  RuntimeDiagnostics,
} from "../../src/lib/runtime-diagnostics.ts";
import { DevelopmentDiagnosticsTransport } from "../../src/lib/runtime-diagnostics-dev.ts";

Deno.test("runtime timeline retains 32 projected events and exposes the latest transition", () => {
  let now = 1_000;
  const diagnostics = new RuntimeDiagnostics("poe2", "v0.5.0", {
    devTransport: false,
    now: () => now++,
    runId: "run-1",
  });

  for (let index = 0; index < 40; index++) {
    diagnostics.record("driver", "started", { build: "release", index });
  }

  const snapshot = diagnostics.snapshot();
  assertEquals(snapshot.timeline.length, 32);
  assertEquals(snapshot.timeline[0].seq, 9);
  assertEquals(snapshot.timeline.at(-1)?.seq, 40);
  assertEquals(snapshot.phase, "driver.started");
  assertEquals(snapshot.lastTransition?.elapsedMs, 1);
});

Deno.test("runtime projection excludes high-frequency events and non-allowlisted data", () => {
  assertEquals(projectRuntimeEvent("frame", "complete", { duration: 5 }), undefined);
  assertEquals(projectRuntimeEvent("canvas", "resize", { width: 100 }), undefined);
  assertEquals(projectRuntimeEvent("input", "keydown", { key: "a" }), undefined);

  assertEquals(
    projectRuntimeEvent("worker", "rpc-error", {
      operation: "resize",
      message: "safe structured message",
      token: "secret",
      url: "https://pob.cool/?token=secret#build=secret",
      headers: { authorization: "Bearer secret" },
      body: "secret",
      buildCode: "secret",
      clipboard: "secret",
      arbitrary: { nested: true },
    }),
    { operation: "resize" },
  );
});

Deno.test("runtime subscribers cannot make the observed operation fail", () => {
  const diagnostics = new RuntimeDiagnostics("poe2", "v0.5.0", { devTransport: false, runId: "run-1" });
  diagnostics.subscribe(() => {
    throw new Error("observer failed");
  });
  diagnostics.record("driver", "started");
  assertEquals(diagnostics.snapshot().phase, "driver.started");
});

Deno.test("runtime core does not use timer, network, or storage when the development transport is disabled", () => {
  const calls: string[] = [];
  const globals = globalThis as typeof globalThis & {
    fetch?: typeof fetch;
    sessionStorage?: Storage;
    setInterval?: typeof setInterval;
  };
  const originalFetch = globals.fetch;
  const originalStorage = globals.sessionStorage;
  const originalSetInterval = globals.setInterval;

  try {
    globals.fetch = (() => {
      calls.push("fetch");
      throw new Error("unexpected fetch");
    }) as typeof fetch;
    Object.defineProperty(globals, "sessionStorage", {
      configurable: true,
      value: { setItem: () => calls.push("storage") },
    });
    globals.setInterval = (() => {
      calls.push("timer");
      return 0;
    }) as unknown as typeof setInterval;

    const diagnostics = new RuntimeDiagnostics("poe1", "v2.68.0", {
      devTransport: false,
      now: () => 0,
      runId: "run-1",
    });
    diagnostics.record("driver", "start", { build: "release" });
    diagnostics.complete("test");
    assertEquals(calls, []);
  } finally {
    globals.fetch = originalFetch;
    Object.defineProperty(globals, "sessionStorage", { configurable: true, value: originalStorage });
    globals.setInterval = originalSetInterval;
  }
});

Deno.test("development transport retains the previous-run event in its own snapshot", () => {
  withBrowserGlobals({
    storedSnapshot: JSON.stringify({ runId: "previous-run", complete: false, events: [] }),
    sendBeacon: () => true,
  }, () => {
    const diagnostics = new RuntimeDiagnostics("poe2", "v0.5.0", {
      devTransport: true,
      now: () => 0,
      runId: "current-run",
    });
    const control = (window as unknown as {
      __POB_DIAGNOSTICS__?: { snapshot: () => { events: RuntimeDiagnosticEvent[] } };
    }).__POB_DIAGNOSTICS__;

    assertEquals(control?.snapshot().events, [{
      source: "pob-diagnostic",
      runId: "current-run",
      seq: 1,
      at: "1970-01-01T00:00:00.000Z",
      level: "error",
      phase: "page",
      event: "previous-run-incomplete",
      game: "poe2",
      pobVersion: "v0.5.0",
      data: { previousRunId: "previous-run" },
    }]);
    diagnostics.complete("test");
  });
});

Deno.test("development transport falls back to keepalive fetch when the final beacon is rejected", () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  withBrowserGlobals({
    sendBeacon: () => false,
    fetch: (input, init) => {
      requests.push({ input: String(input), init });
      return Promise.resolve(new Response(null, { status: 200 }));
    },
  }, () => {
    const transport = new DevelopmentDiagnosticsTransport("run-1");
    transport.record({
      source: "pob-diagnostic",
      runId: "run-1",
      seq: 1,
      at: "1970-01-01T00:00:00.000Z",
      level: "info",
      phase: "driver",
      event: "start",
      game: "poe2",
      pobVersion: "v0.5.0",
      data: {},
    });
    transport.complete();
  });

  assertEquals(requests.length, 1);
  assertEquals(requests[0].input, "/__pob_diagnostics");
  assertEquals(requests[0].init?.keepalive, true);
});

type BrowserGlobalsOptions = {
  storedSnapshot?: string;
  sendBeacon: (url: string | URL, data?: BodyInit | null) => boolean;
  fetch?: typeof fetch;
};

function withBrowserGlobals(options: BrowserGlobalsOptions, callback: () => void): void {
  const globals = globalThis as typeof globalThis & {
    __POB_DIAGNOSTICS__?: unknown;
    sessionStorage?: Storage;
  };
  const names = ["window", "sessionStorage", "navigator", "fetch", "setInterval", "clearInterval"] as const;
  const descriptors = Object.fromEntries(names.map((name) => [name, Object.getOwnPropertyDescriptor(globals, name)]));
  let storedSnapshot = options.storedSnapshot ?? null;

  try {
    Object.defineProperty(globals, "window", { configurable: true, value: globals });
    Object.defineProperty(globals, "sessionStorage", {
      configurable: true,
      value: {
        getItem: () => storedSnapshot,
        setItem: (_key: string, value: string) => {
          storedSnapshot = value;
        },
      },
    });
    Object.defineProperty(globals, "navigator", {
      configurable: true,
      value: { sendBeacon: options.sendBeacon },
    });
    Object.defineProperty(globals, "fetch", {
      configurable: true,
      value: options.fetch ?? (() => Promise.resolve(new Response(null, { status: 200 }))),
    });
    Object.defineProperty(globals, "setInterval", { configurable: true, value: () => 1 });
    Object.defineProperty(globals, "clearInterval", { configurable: true, value: () => {} });
    callback();
  } finally {
    delete globals.__POB_DIAGNOSTICS__;
    for (const name of names) {
      const descriptor = descriptors[name];
      if (descriptor) Object.defineProperty(globals, name, descriptor);
      else delete globals[name];
    }
  }
}
