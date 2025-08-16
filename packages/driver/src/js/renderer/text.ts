import { TextureFlags, TextureSource } from "../image";
import type { TextureBitmap } from "./renderer";

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

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

export class TextMetrics {
  private readonly context;
  private measureCache = new LRUCache<string, number>(10000);
  private currentFont = "";

  constructor() {
    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to get 2D context");
    this.context = context;
  }

  measure(size: number, fontNum: number, text: string) {
    const cacheKey = `${size}:${fontNum}:${text}`;
    const cached = this.measureCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const fontStr = font(size, fontNum);
    if (this.currentFont !== fontStr) {
      this.context.font = fontStr;
      this.currentFont = fontStr;
    }

    const lines = text.replaceAll(reColorGlobal, "").split("\n");
    const result = Math.ceil(Math.max(0, ...lines.map(line => this.context.measureText(line).width)));

    this.measureCache.set(cacheKey, result);
    return result;
  }

  measureCursorIndex(size: number, fontNum: number, text: string, cursorX: number, cursorY: number) {
    const fontStr = font(size, fontNum);
    if (this.currentFont !== fontStr) {
      this.context.font = fontStr;
      this.currentFont = fontStr;
    }
    const lines = text.split("\n");
    const y = Math.floor(Math.max(0, Math.min(lines.length - 1, cursorY / size)));
    const line = lines[y];
    let i = 0;
    for (; i <= line.length; i++) {
      const w = this.context.measureText(line.substring(0, i).replaceAll(reColorGlobal, "")).width;
      if (w >= cursorX) {
        break;
      }
    }
    for (let j = 0; j < y; j++) {
      i += lines[j].length + 1;
    }
    return i;
  }

  fittingText(size: number, fontNum: number, text: string, maxWidth: number) {
    const fontStr = font(size, fontNum);
    if (this.currentFont !== fontStr) {
      this.context.font = fontStr;
      this.currentFont = fontStr;
    }
    const line = text.replaceAll(reColorGlobal, "");
    let width = 0;
    for (let i = 0; i < line.length; i++) {
      const w = this.context.measureText(line[i]).width;
      if (width + w > maxWidth) {
        return { width, head: line.substring(0, i), tail: line.substring(i) };
      }
      width += w;
    }
    return { width, head: line, tail: "" };
  }
}

export interface TextRender {
  width: number;
  bitmap: TextureBitmap | undefined;
  coords: number[];
}

export interface TextRasterizer {
  get(size: number, fontNum: number, text: string): TextRender[];
}

export class SimpleTextRasterizer implements TextRasterizer {
  private readonly cache: Map<string, TextRender> = new Map();

  constructor(readonly textMetrics: TextMetrics) {}

  get(size: number, fontNum: number, text: string) {
    const key = `${size}:${fontNum}:${text}`;
    let render = this.cache.get(key);
    if (!render) {
      const width = this.textMetrics.measure(size, fontNum, text);
      if (width > 0) {
        const canvas = new OffscreenCanvas(width, size);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get 2D context");
        context.font = font(size, fontNum);
        context.fillStyle = "white";
        context.textBaseline = "bottom";
        context.fillText(text, 0, size);
        render = {
          width,
          bitmap: {
            id: key,
            source: TextureSource.newImage(canvas, TextureFlags.TF_NOMIPMAP | TextureFlags.TF_CLAMP),
          },
          coords: [0, 0, 1, 0, 1, 1, 0, 1],
        };
        this.cache.set(key, render);
      } else {
        render = {
          width: 0,
          bitmap: undefined,
          coords: [0, 0, 1, 0, 1, 1, 0, 1],
        };
      }
    }
    return [render];
  }
}

type Rectangle = {
  width: number;
  height: number;
  x: number;
  y: number;
};

interface BinPack {
  add(width: number, height: number): Rectangle | undefined;
}

class BinaryBinPack implements BinPack {
  private readonly freeRectangles: Rectangle[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.freeRectangles = [{ width: width, height: height, x: 0, y: 0 }];
  }

  private findFreeRectangle(width: number, height: number): { index: number; rect: Rectangle } | null {
    for (let i = 0; i < this.freeRectangles.length; i++) {
      const rect = this.freeRectangles[i];
      if (rect.width >= width && rect.height >= height) {
        return { index: i, rect: rect };
      }
    }
    return null;
  }

  private splitFreeRectangle(freeRect: Rectangle, width: number, height: number): void {
    const rightSplit = {
      width: freeRect.width - width,
      height: height,
      x: freeRect.x + width,
      y: freeRect.y,
    };
    const bottomSplit = {
      width: freeRect.width,
      height: freeRect.height - height,
      x: freeRect.x,
      y: freeRect.y + height,
    };
    if (rightSplit.width > 0 && rightSplit.height > 0) this.freeRectangles.push(rightSplit);
    if (bottomSplit.width > 0 && bottomSplit.height > 0) this.freeRectangles.push(bottomSplit);
  }

  add(width: number, height: number): Rectangle | undefined {
    const found = this.findFreeRectangle(width, height);
    if (found) {
      const { index, rect } = found;
      const newRect = { width, height, x: rect.x, y: rect.y };

      this.freeRectangles.splice(index, 1);
      this.splitFreeRectangle(rect, width, height);
      return newRect;
    }
  }
}

export class BinPackingTextRasterizer {
  private size: { width: number; height: number };
  // @ts-ignore
  private canvas: OffscreenCanvas;
  // @ts-ignore
  private context: OffscreenCanvasRenderingContext2D;
  // @ts-ignore
  private packer: BinPack;
  private cache: Map<string, TextRender[]> = new Map();
  private generation = 0;

  constructor(readonly textMetrics: TextMetrics) {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("Failed to get WebGL context");
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const size = 4096;
    this.size = { width: Math.min(size, maxTextureSize), height: Math.min(size, maxTextureSize) };

    this.reset();
  }

  private reset() {
    this.canvas = new OffscreenCanvas(this.size.width, this.size.height);
    const context = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Failed to get 2D context");
    this.context = context;
    this.context.fillStyle = "white";
    this.context.textBaseline = "bottom";
    this.packer = new BinaryBinPack(this.size.width, this.size.height);
    this.generation += 1;
    console.log("BinPackingTextRasterizer: reset");
  }

  get(height: number, fontNum: number, text: string) {
    const key = `${height}:${fontNum}:${text}`;
    let render = this.cache.get(key);
    if (!render) {
      const width = this.textMetrics.measure(height, fontNum, text);
      if (width > 0) {
        if (width > this.size.width) {
          const renders = [];
          let parts = { width: 0, head: "", tail: text };
          while (parts.tail !== "") {
            parts = this.textMetrics.fittingText(height, fontNum, parts.tail, this.size.width);
            renders.push(this.drawText(parts.head, parts.width, height, fontNum));
          }
          render = renders.map(r => r.forOnce);
          this.cache.set(
            key,
            renders.map(r => r.forCache),
          );
        } else {
          const r = this.drawText(text, width, height, fontNum);
          render = [r.forOnce];
          this.cache.set(key, [r.forCache]);
        }
      } else {
        render = [
          {
            width: 0,
            bitmap: undefined,
            coords: [0, 0, 1, 0, 1, 1, 0, 1],
          },
        ];
      }
    }
    return render;
  }

  private drawText(text: string, width: number, height: number, fontNum: number) {
    let rect = this.packer.add(width, height);
    if (!rect) {
      this.reset();
      rect = this.packer.add(width, height);
      if (!rect) throw new Error("Failed to add text to texture");
    }

    this.context.font = font(height, fontNum);
    this.context.fillText(text, rect.x, rect.y + rect.height);

    const u1 = rect.x / this.size.width;
    const v1 = rect.y / this.size.height;
    const u2 = (rect.x + rect.width) / this.size.width;
    const v2 = (rect.y + rect.height) / this.size.height;
    const bitmap = {
      id: `@text:${this.generation}`,
      source: TextureSource.newImage(this.canvas, TextureFlags.TF_NOMIPMAP | TextureFlags.TF_CLAMP),
      flags: TextureFlags.TF_NOMIPMAP | TextureFlags.TF_CLAMP,
    };
    const forCache = {
      width,
      coords: [u1, v1, u2, v1, u2, v2, u1, v2],
      bitmap: {
        ...bitmap,
      },
    };
    const forOnce = {
      ...forCache,
      bitmap: {
        ...forCache.bitmap,
        updateSubImage: () => {
          const context = this.context;
          return {
            ...rect,
            source: context.getImageData(rect.x, rect.y, rect.width, rect.height).data,
          };
        },
      },
    };
    return { forCache, forOnce };
  }
}
