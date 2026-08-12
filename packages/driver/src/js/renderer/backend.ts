import type { TextureBitmap } from "./renderer.ts";

export type GlyphAtlasTexture = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly layers: number;
  readonly layer: number;
};

export type BackendStats = {
  instances: number;
  instanceBytes: number;
  dispatches: number;
};

export interface RenderBackend {
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
  drawGlyph(
    coords: number[],
    texCoords: number[],
    texture: GlyphAtlasTexture,
    tintColor: number[],
  ): void;
  drawQuad(
    coords: number[],
    texCoords: number[],
    textureBitmap: TextureBitmap,
    tintColor: number[],
    stackLayer: number,
    maskLayer: number,
  ): void;
}
