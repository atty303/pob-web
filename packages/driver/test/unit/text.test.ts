import { assertEquals, assertRejects } from "@std/assert";
import { environmentErrorCategory } from "../../src/js/error.ts";
import { loadFont } from "../../src/js/renderer/text.ts";

Deno.test("font parsing failures are classified as initial asset errors", async () => {
  const parsingError = new Error("invalid font data");
  const originalFetch = globalThis.fetch;
  const originalFontFace = globalThis.FontFace;
  const originalSelf = globalThis.self;

  globalThis.fetch = async () => new Response(new ArrayBuffer(8));
  globalThis.FontFace = class {
    load() {
      return Promise.reject(parsingError);
    }
  } as unknown as typeof FontFace;
  globalThis.self = { fonts: { add: () => {} } } as unknown as typeof self;
  try {
    const error = await assertRejects(() => loadFont("/broken.woff", "Broken"));
    assertEquals(error, parsingError);
    assertEquals(environmentErrorCategory(error), "assetLoad");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.FontFace = originalFontFace;
    globalThis.self = originalSelf;
  }
});
