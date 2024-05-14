import { TextureFlags } from "../image.ts";
import type { TextureBitmap } from "./renderer.ts";

const reColorGlobal = /\^([0-9])|\^[xX]([0-9a-fA-F]{6})/g;

interface WorkerGlobalScope {
  fonts: FontFaceSet;
}

export class TextRasterizer {
  static async loadFonts() {
    await TextRasterizer.loadFont("/LiberationSans-Regular.woff", "Liberation Sans");
    await TextRasterizer.loadFont("/LiberationSans-Bold.woff", "Liberation Sans Bold");
    await TextRasterizer.loadFont("/VeraMono.woff", "Bitstream Vera Mono");
  }

  static async loadFont(url: string, family: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load font: ${url}`);
    const blob = await r.blob();
    const fontFace = new FontFace(family, await blob.arrayBuffer());
    await fontFace.load();
    (self as unknown as WorkerGlobalScope).fonts.add(fontFace);
  }

  private static font(size: number, fontNum: number) {
    const fontSize = size - 2;
    switch (fontNum) {
      case 1:
        return `${fontSize}px Liberation Sans`;
      case 2:
        return `${fontSize}px Liberation Sans Bold`;
      default:
        return `${fontSize}px Bitstream Vera Mono`;
    }
  }

  private readonly cache: Map<string, { width: number; bitmap: TextureBitmap | undefined }> = new Map();
  private readonly context;

  constructor() {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl");
    if (gl) {
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      console.log("maxTextureSize", maxTextureSize);
    }

    const canvas1 = new OffscreenCanvas(1, 1);
    const context = canvas1.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context");
    this.context = context;
  }

  measureText(size: number, font: number, text: string) {
    this.context.font = TextRasterizer.font(size, font);
    return this.context.measureText(text.replaceAll(reColorGlobal, "")).width;
  }

  measureTextCursorIndex(size: number, font: number, text: string, cursorX: number, cursorY: number) {
    this.context.font = TextRasterizer.font(size, font);
    const lines = text.split("\n");
    const y = Math.floor(Math.max(0, Math.min(lines.length - 1, cursorY / size)));
    const line = lines[y];
    let i = 0;
    for (; i <= line.length; i++) {
      const w = this.context.measureText(line.substring(0, i)).width;
      if (w >= cursorX) {
        break;
      }
    }
    for (let j = 0; j < y; j++) {
      i += lines[j].length + 1;
    }
    return i;
  }

  get(size: number, font: number, text: string) {
    const key = `${size}:${font}:${text}`;
    let bitmap = this.cache.get(key);
    if (!bitmap) {
      const width = this.measureText(size, font, text);
      if (width > 0) {
        const canvas = new OffscreenCanvas(width, size);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get 2D context");
        context.font = TextRasterizer.font(size, font);
        context.fillStyle = "white";
        context.textBaseline = "bottom";
        context.fillText(text, 0, size);
        bitmap = {
          width,
          bitmap: { id: key, bitmap: canvas, flags: TextureFlags.TF_NOMIPMAP | TextureFlags.TF_CLAMP },
        };
        this.cache.set(key, bitmap);
      } else {
        bitmap = {
          width: 0,
          bitmap: undefined,
        };
      }
    }
    return bitmap;
  }
}
