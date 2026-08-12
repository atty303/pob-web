import type { TextureBitmap } from "../image.ts";

export type GlyphAtlasTexture = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly layers: number;
  readonly layer: number;
};

export type BackendStats = {
  name: "WebGL2" | "WebGPU" | "None";
  instances: number;
  instanceBytes: number;
  dispatches: number;
};

export interface RenderBackend {
  readonly name: "WebGL2" | "WebGPU";
  readonly canvas: OffscreenCanvas;

  resize(width: number, height: number, pixelRatio: number): void;
  setViewport(x: number, y: number, width: number, height: number): void;
  beginFrame(): void;
  getStats(): BackendStats;
  begin(): void;
  end(): void;
  flush(): void;
  createGlyphAtlasTexture(id: string, width: number, height: number, layers: number): GlyphAtlasTexture;
  uploadGlyph(
    texture: GlyphAtlasTexture,
    x: number,
    y: number,
    width: number,
    height: number,
    pixels: Uint8Array<ArrayBuffer>,
  ): void;
  destroyGlyphAtlasTexture(texture: GlyphAtlasTexture): void;
  drawQuad(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    s1: number,
    t1: number,
    s2: number,
    t2: number,
    s3: number,
    t3: number,
    s4: number,
    t4: number,
    texture: TextureBitmap | GlyphAtlasTexture,
    packedColor: number,
    textureLayer: number,
    maskLayer: number,
    glyph: boolean,
  ): void;
}
