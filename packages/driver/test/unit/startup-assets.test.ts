import { assertEquals, assertRejects, assertStrictEquals } from "@std/assert";
import { loadStartupAssets } from "../../src/js/startup-assets.ts";
import { loadFonts } from "../../src/js/renderer/text.ts";

Deno.test("module, fonts and filesystem start together and all gate Lua readiness", async () => {
  const started: string[] = [];
  const resolvers: (() => void)[] = [];
  const prerequisite = (name: string) => () => {
    started.push(name);
    return new Promise<void>((resolve) => resolvers.push(resolve));
  };
  let ready = false;
  const result = loadStartupAssets(prerequisite("wasm"), prerequisite("fonts"), prerequisite("filesystem"))
    .then(() => {
      ready = true;
    });
  assertEquals(started, ["wasm", "fonts", "filesystem"]);
  resolvers[0]();
  resolvers[1]();
  await Promise.resolve();
  await Promise.resolve();
  assertEquals(ready, false);
  resolvers[2]();
  await result;
  assertEquals(ready, true);
});

Deno.test("a rejected startup prerequisite preserves its original error", async () => {
  const failure = new Error("filesystem failed");
  const error = await assertRejects(() =>
    loadStartupAssets(
      () => Promise.resolve({}),
      () => Promise.resolve(),
      () => Promise.reject(failure),
    )
  );
  assertStrictEquals(error, failure);
});

Deno.test("all six fonts begin fetching before the first font resolves", async () => {
  const originalFetch = globalThis.fetch;
  const originalFontFace = globalThis.FontFace;
  const originalFonts = Object.getOwnPropertyDescriptor(globalThis, "fonts");
  const requests: string[] = [];
  const resolvers: ((response: Response) => void)[] = [];
  globalThis.fetch = ((url: RequestInfo | URL) => {
    requests.push(String(url));
    return new Promise<Response>((resolve) => resolvers.push(resolve));
  }) as typeof fetch;
  globalThis.FontFace = class {
    load() {
      return Promise.resolve(this);
    }
  } as unknown as typeof FontFace;
  Object.defineProperty(globalThis, "fonts", { configurable: true, value: { add() {} } });
  try {
    const loading = loadFonts();
    assertEquals(requests.length, 6);
    resolvers.forEach((resolve) => resolve(new Response(new ArrayBuffer(8))));
    await loading;
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.FontFace = originalFontFace;
    if (originalFonts) Object.defineProperty(globalThis, "fonts", originalFonts);
    else Reflect.deleteProperty(globalThis, "fonts");
  }
});
