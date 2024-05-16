import { TextureFlags } from "../image.ts";
import type { TextureBitmap } from "./renderer.ts";

const reColorGlobal = /\^([0-9])|\^[xX]([0-9a-fA-F]{6})/g;

export async function loadFonts() {
  await loadFont("/LiberationSans-Regular.woff", "Liberation Sans");
  await loadFont("/LiberationSans-Bold.woff", "Liberation Sans Bold");
  await loadFont("/VeraMono.woff", "Bitstream Vera Mono");
}

async function loadFont(url: string, family: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load font: ${url}`);
  const blob = await r.blob();
  const fontFace = new FontFace(family, await blob.arrayBuffer());
  await fontFace.load();
  (self as unknown as { fonts: FontFaceSet }).fonts.add(fontFace);
}

function font(size: number, fontNum: number) {
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

export class TextMetrics {
  private readonly context;

  constructor() {
    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context");
    this.context = context;
  }

  measure(size: number, fontNum: number, text: string) {
    this.context.font = font(size, fontNum);
    return this.context.measureText(text.replaceAll(reColorGlobal, "")).width;
  }

  measureCursorIndex(size: number, fontNum: number, text: string, cursorX: number, cursorY: number) {
    this.context.font = font(size, fontNum);
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
}

export interface TextRender {
  width: number;
  bitmap: TextureBitmap | undefined;
}

export interface TextRasterizer {
  get(size: number, fontNum: number, text: string): TextRender;
}

export class SimpleTextRasterizer implements TextRasterizer {
  private readonly cache: Map<string, TextRender> = new Map();

  constructor(readonly textMetrics: TextMetrics) {}

  get(size: number, fontNum: number, text: string) {
    const key = `${size}:${fontNum}:${text}`;
    let bitmap = this.cache.get(key);
    if (!bitmap) {
      const width = this.textMetrics.measure(size, fontNum, text);
      if (width > 0) {
        const canvas = new OffscreenCanvas(width, size);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get 2D context");
        context.font = font(size, fontNum);
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

export class BinPackingTextRasterizer {
  private readonly maxTextureSize: number;

  constructor(readonly textMetrics: TextMetrics) {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl");
    if (gl) {
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    }
  }
}
