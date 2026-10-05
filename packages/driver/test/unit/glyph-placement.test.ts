import { assertEquals } from "@std/assert";
import type { RenderBackend } from "../../src/js/renderer/backend.ts";
import { GlyphAtlas, type TextMetrics } from "../../src/js/renderer/text.ts";

Deno.test("glyph placement snaps physical pixels without rounding advances or kerning", () => {
  const original = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class {
    constructor(public width: number, public height: number) {}
    getContext() {
      return {
        fillText() {},
        getImageData: () => {
          const data = new Uint8ClampedArray(this.width * this.height * 4);
          data[3] = 255;
          return { data };
        },
      };
    }
  } as unknown as typeof OffscreenCanvas;
  const quads: number[][] = [];
  const backend = {
    createGlyphAtlasTexture: (id: string, width: number, height: number, layers: number) => ({
      id,
      width,
      height,
      layers,
      layer: 0,
    }),
    uploadGlyph() {},
    drawQuad: (...args: unknown[]) => quads.push(args.slice(0, 8) as number[]),
  } as unknown as RenderBackend;
  const metrics = {
    measureGlyph: (_height: number, _font: number, text: string) => ({
      width: text.length === 2 ? 2.6 : 1.4,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 1,
      actualBoundingBoxAscent: 1,
      actualBoundingBoxDescent: 0,
    }),
  } as unknown as TextMetrics;
  try {
    const atlas = new GlyphAtlas(metrics);
    atlas.setBackend(backend);
    atlas.draw(12, 0, "abcd", 0.2, 0.25, 0xffffffff);
    // Quad positions include the atlas's one-pixel transparent border.
    assertEquals(quads.map((quad) => quad[0]), [-1, 1, 2, 3]);
    assertEquals(quads.every((quad) => quad.every(Number.isInteger)), true);
    quads.length = 0;
    atlas.draw(12, 1, "abcd", 0.2, 0.25, 0xffffffff);
    assertEquals(quads.map((quad) => quad[0]), [-1, 0, 2, 3]);
    quads.length = 0;
    atlas.draw(12, 0, "a", -0.8, -0.8, 0xffffffff);
    assertEquals(quads[0][0], -2);
  } finally {
    globalThis.OffscreenCanvas = original;
  }
});
