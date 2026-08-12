import { markEnvironmentError } from "../error.ts";
import type { GlyphAtlasTexture, RenderBackend } from "./backend.ts";

const reColorGlobal = /\^([0-9])|\^[xX]([0-9a-fA-F]{6})/g;

export async function loadFonts() {
  await loadFont("/LiberationSans-Regular.woff", "Liberation Sans");
  await loadFont("/LiberationSans-Bold.woff", "Liberation Sans Bold");
  await loadFont("/VeraMono.woff", "Bitstream Vera Mono");
  await loadFont("/Fontin-Italic.woff", "Fontin Italic");
  await loadFont("/Fontin-Regular.woff", "Fontin Regular");
  await loadFont("/Fontin-SmallCaps.woff", "Fontin SmallCaps");
}

export async function loadFont(url: string, family: string) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load font: ${url} (${r.status} ${r.statusText})`);
    const data = await r.arrayBuffer();
    const fontFace = new FontFace(family, data);
    await fontFace.load();
    (self as unknown as { fonts: FontFaceSet }).fonts.add(fontFace);
  } catch (error) {
    throw markEnvironmentError(error, "assetLoad");
  }
}

function font(size: number, fontNum: number) {
  const fontSize = size - 2;
  switch (fontNum) {
    case 1:
      return `${fontSize}px Liberation Sans`;
    case 2:
      return `${fontSize}px Liberation Sans Bold`;
    case 3:
      return `${fontSize}px Fontin SmallCaps`;
    case 4:
      return `italic ${fontSize}px Fontin SmallCaps`;
    case 5:
      return `${fontSize}px Fontin Regular`;
    case 6:
      return `${fontSize}px Fontin Italic`;
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
    const result = Math.ceil(lines.reduce((max, line) => Math.max(max, this.context.measureText(line).width), 0));

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

  measureGlyph(size: number, fontNum: number, glyph: string) {
    const fontStr = font(size, fontNum);
    if (this.currentFont !== fontStr) {
      this.context.font = fontStr;
      this.currentFont = fontStr;
    }
    return this.context.measureText(glyph);
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

export type GlyphAtlasStats = {
  lookups: number;
  hits: number;
  misses: number;
  rasterizeTime: number;
  uploadedBytes: number;
  glyphQuads: number;
  pages: number;
  evictions: number;
};

type Glyph = {
  advance: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  texture: GlyphAtlasTexture;
  texCoords: number[];
};

type EmptyGlyph = {
  advance: number;
  width: 0;
  height: 0;
};

type AtlasPage = {
  texture: GlyphAtlasTexture;
  packer: BinPack;
  keys: Set<string>;
  lastUsed: number;
  generation: number;
};

const ATLAS_SIZE = 2048;
const MAX_ATLAS_PAGES = 8;
const GLYPH_PADDING = 1;
let atlasInstance = 0;

export type GlyphAtlasOptions = {
  atlasSize?: number;
  maxPages?: number;
};

export class GlyphAtlas {
  private readonly canvas = new OffscreenCanvas(1, 1);
  private readonly context: OffscreenCanvasRenderingContext2D;
  private readonly glyphs = new Map<string, Glyph | EmptyGlyph>();
  private readonly kernings = new Map<string, number>();
  private readonly pages: AtlasPage[] = [];
  private atlasTexture: GlyphAtlasTexture | undefined;
  private backend: RenderBackend | undefined;
  private clock = 0;
  private readonly instance = ++atlasInstance;
  private readonly atlasSize: number;
  private readonly maxPages: number;
  private stats: GlyphAtlasStats = GlyphAtlas.emptyStats();

  constructor(readonly textMetrics: TextMetrics, options: GlyphAtlasOptions = {}) {
    this.atlasSize = options.atlasSize ?? ATLAS_SIZE;
    this.maxPages = options.maxPages ?? MAX_ATLAS_PAGES;
    const context = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Failed to get 2D context");
    this.context = context;
  }

  setBackend(backend: RenderBackend | undefined) {
    if (backend === this.backend) return;
    if (this.backend) {
      if (this.atlasTexture) this.backend.destroyGlyphAtlasTexture(this.atlasTexture);
    }
    this.backend = backend;
    this.pages.length = 0;
    this.atlasTexture = undefined;
    this.glyphs.clear();
    this.stats.pages = 0;
  }

  draw(height: number, fontNum: number, text: string, x: number, y: number, color: number[]) {
    if (!this.backend) return;
    let penX = 0;
    let previous: string | undefined;
    for (const scalar of text) {
      if (previous !== undefined) penX += this.kerning(height, fontNum, previous, scalar);
      const glyph = this.getGlyph(height, fontNum, scalar);
      if ("texture" in glyph) {
        const x1 = x + penX + glyph.offsetX;
        const y1 = y + glyph.offsetY;
        this.backend.drawGlyph(
          [x1, y1, x1 + glyph.width, y1, x1 + glyph.width, y1 + glyph.height, x1, y1 + glyph.height],
          glyph.texCoords,
          glyph.texture,
          color,
        );
        this.stats.glyphQuads++;
      }
      penX += glyph.advance;
      previous = scalar;
    }
  }

  getStats(): GlyphAtlasStats {
    return { ...this.stats, pages: this.pages.length };
  }

  resetFrameStats() {
    const pages = this.pages.length;
    this.stats = { ...GlyphAtlas.emptyStats(), pages };
  }

  private getGlyph(height: number, fontNum: number, scalar: string): Glyph | EmptyGlyph {
    const key = `${height}:${fontNum}:${scalar}`;
    this.stats.lookups++;
    const cached = this.glyphs.get(key);
    if (cached) {
      this.stats.hits++;
      const page = "texture" in cached
        ? this.pages.find((candidate) =>
          candidate.texture.id === cached.texture.id && candidate.texture.layer === cached.texture.layer
        )
        : undefined;
      if (page) page.lastUsed = ++this.clock;
      return cached;
    }

    this.stats.misses++;
    const started = performance.now();
    const measured = this.textMetrics.measureGlyph(height, fontNum, scalar);
    const advance = measured.width;
    const left = Math.ceil(measured.actualBoundingBoxLeft);
    const right = Math.ceil(measured.actualBoundingBoxRight);
    const rasterWidth = left + right;

    if (rasterWidth <= 0 || height <= 0) {
      const empty: EmptyGlyph = { advance, width: 0, height: 0 };
      this.glyphs.set(key, empty);
      this.stats.rasterizeTime += performance.now() - started;
      return empty;
    }

    this.canvas.width = rasterWidth;
    this.canvas.height = height;
    this.context.font = font(height, fontNum);
    this.context.fillStyle = "white";
    this.context.textBaseline = "bottom";
    this.context.fillText(scalar, left, height);
    const rgba = this.context.getImageData(0, 0, rasterWidth, height).data;
    const bounds = alphaBounds(rgba, rasterWidth, height);
    if (!bounds) {
      const empty: EmptyGlyph = { advance, width: 0, height: 0 };
      this.glyphs.set(key, empty);
      this.stats.rasterizeTime += performance.now() - started;
      return empty;
    }

    const contentWidth = bounds.right - bounds.left;
    const contentHeight = bounds.bottom - bounds.top;
    const width = contentWidth + GLYPH_PADDING * 2;
    const bitmapHeight = contentHeight + GLYPH_PADDING * 2;
    const alpha = new Uint8Array(width * bitmapHeight);
    for (let y = 0; y < contentHeight; y++) {
      for (let x = 0; x < contentWidth; x++) {
        const source = ((bounds.top + y) * rasterWidth + bounds.left + x) * 4 + 3;
        alpha[(y + GLYPH_PADDING) * width + x + GLYPH_PADDING] = rgba[source];
      }
    }

    const { page, rect } = this.allocate(key, width, bitmapHeight);
    this.backend!.uploadGlyph(page.texture, rect.x, rect.y, width, bitmapHeight, alpha);
    this.stats.uploadedBytes += alpha.byteLength;
    this.stats.rasterizeTime += performance.now() - started;

    const u1 = rect.x / this.atlasSize;
    const v1 = rect.y / this.atlasSize;
    const u2 = (rect.x + width) / this.atlasSize;
    const v2 = (rect.y + bitmapHeight) / this.atlasSize;
    const glyph: Glyph = {
      advance,
      offsetX: bounds.left - left - GLYPH_PADDING,
      offsetY: bounds.top - GLYPH_PADDING,
      width,
      height: bitmapHeight,
      texture: page.texture,
      texCoords: [u1, v1, u2, v1, u2, v2, u1, v2],
    };
    this.glyphs.set(key, glyph);
    return glyph;
  }

  private kerning(height: number, fontNum: number, left: string, right: string) {
    if (fontNum === 0) return 0;
    const key = `${height}:${fontNum}:${left}:${right}`;
    const cached = this.kernings.get(key);
    if (cached !== undefined) return cached;
    const value = this.textMetrics.measureGlyph(height, fontNum, left + right).width -
      this.textMetrics.measureGlyph(height, fontNum, left).width -
      this.textMetrics.measureGlyph(height, fontNum, right).width;
    this.kernings.set(key, value);
    return value;
  }

  private allocate(key: string, width: number, height: number): { page: AtlasPage; rect: Rectangle } {
    if (width > this.atlasSize || height > this.atlasSize) {
      throw new Error(`Glyph exceeds atlas page: ${width}x${height}`);
    }
    for (const page of this.pages) {
      const rect = page.packer.add(width, height);
      if (rect) {
        page.keys.add(key);
        page.lastUsed = ++this.clock;
        return { page, rect };
      }
    }

    if (this.pages.length < this.maxPages) {
      const page = this.createPage(this.pages.length, 0);
      this.pages.push(page);
      const rect = page.packer.add(width, height)!;
      page.keys.add(key);
      return { page, rect };
    }

    const page = this.pages.reduce((oldest, candidate) => candidate.lastUsed < oldest.lastUsed ? candidate : oldest);
    this.backend!.flush();
    for (const oldKey of page.keys) this.glyphs.delete(oldKey);
    const index = this.pages.indexOf(page);
    const replacement = this.createPage(index, page.generation + 1);
    this.pages[index] = replacement;
    this.stats.evictions++;
    const rect = replacement.packer.add(width, height)!;
    replacement.keys.add(key);
    return { page: replacement, rect };
  }

  private createPage(index: number, generation: number): AtlasPage {
    if (!this.atlasTexture) {
      this.atlasTexture = this.backend!.createGlyphAtlasTexture(
        `@glyph:${this.instance}`,
        this.atlasSize,
        this.atlasSize,
        this.maxPages,
      );
    }
    return {
      texture: { ...this.atlasTexture, layer: index },
      packer: new BinaryBinPack(this.atlasSize, this.atlasSize),
      keys: new Set(),
      lastUsed: ++this.clock,
      generation,
    };
  }

  private static emptyStats(): GlyphAtlasStats {
    return {
      lookups: 0,
      hits: 0,
      misses: 0,
      rasterizeTime: 0,
      uploadedBytes: 0,
      glyphQuads: 0,
      pages: 0,
      evictions: 0,
    };
  }
}

function alphaBounds(rgba: Uint8ClampedArray, width: number, height: number) {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  return right === 0 ? undefined : { left, top, right, bottom };
}
