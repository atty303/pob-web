import type { TextureBitmap } from "./renderer";

export interface RenderBackend {
  readonly canvas: OffscreenCanvas;

  resize(width: number, height: number, pixelRatio: number): void;
  setViewport(x: number, y: number, width: number, height: number): void;
  begin(): void;
  end(): void;
  drawQuad(
    coords: number[],
    texCoords: number[],
    textureBitmap: TextureBitmap,
    tintColor: number[],
    stackLayer: number,
    maskLayer: number,
  ): void;
}
