import { assertEquals, assertRejects } from "@std/assert";
import { environmentErrorCategory } from "../../src/js/error.ts";
import type { RenderBackend } from "../../src/js/renderer/backend.ts";
import { GlyphAtlas, loadFont, type TextMetrics } from "../../src/js/renderer/text.ts";

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

Deno.test("glyph page eviction flushes already resolved glyphs before destroying their texture", () => {
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    getContext() {
      return {
        font: "",
        fillStyle: "",
        textBaseline: "",
        fillText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
      };
    }
  } as unknown as typeof OffscreenCanvas;

  const events: string[] = [];
  const active = new Set<string>();
  const backend = {
    createGlyphAtlasTexture: (id: string, width: number, height: number) => {
      events.push("create");
      active.add(id);
      return { id, width, height };
    },
    uploadGlyph: () => events.push("upload"),
    drawGlyph: (_coords: number[], _texCoords: number[], texture: { id: string }) => {
      if (!active.has(texture.id)) throw new Error("draw used a destroyed glyph texture");
      events.push("draw");
    },
    flush: () => events.push("flush"),
    destroyGlyphAtlasTexture: (texture: { id: string }) => {
      events.push("destroy");
      active.delete(texture.id);
    },
  } as unknown as RenderBackend;
  const textMetrics = {
    measureGlyph: () => ({
      width: 1,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 1,
      actualBoundingBoxAscent: 1,
      actualBoundingBoxDescent: 0,
    }),
  } as unknown as TextMetrics;

  try {
    const atlas = new GlyphAtlas(textMetrics, { atlasSize: 3, maxPages: 1 });
    atlas.setBackend(backend);
    atlas.draw(12, 0, "ab", 0, 0, [1, 1, 1, 1]);
    assertEquals(events, ["create", "upload", "draw", "flush", "destroy", "create", "upload", "draw"]);
    assertEquals(atlas.getStats().evictions, 1);
  } finally {
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  }
});
