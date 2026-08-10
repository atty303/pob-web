import assert from "node:assert/strict";
import test from "node:test";
import { environmentErrorCategory } from "../../src/js/error";
import { loadFont } from "../../src/js/renderer/text";

test("font parsing failures are classified as initial asset errors", async t => {
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
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.FontFace = originalFontFace;
    globalThis.self = originalSelf;
  });

  await assert.rejects(loadFont("/broken.woff", "Broken"), error => {
    assert.equal(error, parsingError);
    assert.equal(environmentErrorCategory(error), "assetLoad");
    return true;
  });
});
