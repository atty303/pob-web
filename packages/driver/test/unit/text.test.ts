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

Deno.test("glyph page eviction flushes resolved glyphs before reusing an atlas layer", () => {
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
        getImageData: () => {
          const data = new Uint8ClampedArray(this.width * this.height * 4);
          data[3] = 255;
          return { data };
        },
      };
    }
  } as unknown as typeof OffscreenCanvas;

  const events: string[] = [];
  const active = new Set<string>();
  const backend = {
    createGlyphAtlasTexture: (id: string, width: number, height: number, layers: number) => {
      events.push("create");
      active.add(id);
      return { id, width, height, layers, layer: 0 };
    },
    uploadGlyph: () => events.push("upload"),
    drawQuad: (...args: unknown[]) => {
      const texture = args[16] as { id: string };
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
    atlas.draw(12, 0, "ab", 0, 0, 0xffffffff);
    assertEquals(events, ["create", "upload", "draw", "flush", "upload", "draw"]);
    assertEquals(atlas.getStats().evictions, 1);
  } finally {
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  }
});

Deno.test("glyph cache hits update the LRU age of their atlas layer", () => {
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
        getImageData: () => {
          const data = new Uint8ClampedArray(this.width * this.height * 4);
          data[3] = 255;
          return { data };
        },
      };
    }
  } as unknown as typeof OffscreenCanvas;

  const uploadedLayers: number[] = [];
  const backend = {
    createGlyphAtlasTexture: (id: string, width: number, height: number, layers: number) => ({
      id,
      width,
      height,
      layers,
      layer: 0,
    }),
    uploadGlyph: (texture: { layer: number }) => uploadedLayers.push(texture.layer),
    drawQuad: () => {},
    flush: () => {},
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
    const atlas = new GlyphAtlas(textMetrics, { atlasSize: 3, maxPages: 2 });
    atlas.setBackend(backend);
    atlas.draw(12, 0, "abbcb", 0, 0, 0xffffffff);
    assertEquals(uploadedLayers, [0, 1, 0]);
    assertEquals(atlas.getStats().misses, 3);
    assertEquals(atlas.getStats().evictions, 1);
  } finally {
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  }
});

Deno.test("glyph rasterization preserves the line box bottom baseline", () => {
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;
  let baseline = "";
  let fillPosition: [number, number] | undefined;
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
        get textBaseline() {
          return baseline;
        },
        set textBaseline(value: string) {
          baseline = value;
        },
        fillText: (_text: string, x: number, y: number) => {
          fillPosition = [x, y];
        },
        getImageData: () => {
          const data = new Uint8ClampedArray(this.width * this.height * 4);
          data[(6 * this.width + 2) * 4 + 3] = 255;
          return { data };
        },
      };
    }
  } as unknown as typeof OffscreenCanvas;

  let coords: number[] | undefined;
  let uploaded: Uint8Array | undefined;
  const backend = {
    createGlyphAtlasTexture: (id: string, width: number, height: number, layers: number) => ({
      id,
      width,
      height,
      layers,
      layer: 0,
    }),
    uploadGlyph: (
      _texture: unknown,
      _x: number,
      _y: number,
      _width: number,
      _height: number,
      pixels: Uint8Array,
    ) => uploaded = pixels,
    drawQuad: (...args: unknown[]) => coords = args.slice(0, 8) as number[],
  } as unknown as RenderBackend;
  const textMetrics = {
    measureGlyph: () => ({
      width: 3,
      actualBoundingBoxLeft: 1,
      actualBoundingBoxRight: 2,
      actualBoundingBoxAscent: 4,
      actualBoundingBoxDescent: 2,
    }),
  } as unknown as TextMetrics;

  try {
    const atlas = new GlyphAtlas(textMetrics);
    atlas.setBackend(backend);
    atlas.draw(10, 0, "g", 4, 8, 0xffffffff);
    assertEquals(baseline, "bottom");
    assertEquals(fillPosition, [1, 10]);
    assertEquals(coords, [4, 13, 7, 13, 7, 16, 4, 16]);
    assertEquals(uploaded, new Uint8Array([0, 0, 0, 0, 255, 0, 0, 0, 0]));
  } finally {
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  }
});
