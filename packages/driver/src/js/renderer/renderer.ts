import { Format, Target, Texture } from "dds";
import { DrawCommandCompiler, type DrawCommandSink } from "../draw.ts";
import { type ImageRepository, type TextureBitmap, TextureFlags, TextureSource } from "../image.ts";
import type { BackendStats, RenderBackend } from "./backend.ts";
import { GlyphAtlas, type GlyphAtlasStats, type TextMetrics } from "./text.ts";

const WHITE_TEXTURE_BITMAP: TextureBitmap = (() => {
  const tex = new Texture(Target.TARGET_2D_ARRAY, Format.RGBA8_UNORM_PACK8, [8, 8, 1], 1, 1, 1);
  const arr = new Uint8Array(8 * 8 * 4).fill(255);
  tex.data = new DataView(arr.buffer);
  return {
    id: "@white",
    source: TextureSource.newTexture(tex, TextureFlags.TF_NOMIPMAP),
  };
})();

const reColor = /\^([0-9])|\^[xX]([0-9a-fA-F]{6})/;
const colorEscape = [
  0x000000ff,
  0xff0000ff,
  0x00ff00ff,
  0x0000ffff,
  0xffff00ff,
  0xff00ffff,
  0x00ffffff,
  0xffffffff,
  0xb3b3b3ff,
  0x666666ff,
];

const packColor = (r: number, g: number, b: number, a: number) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;

export type LayerStats = {
  layer: number;
  sublayer: number;
  drawImageCount: number;
  drawImageQuadCount: number;
  drawStringCount: number;
  totalCommands: number;
};

export type RenderStats = {
  frameCount: number;
  totalLayers: number;
  layerStats: LayerStats[];
  lastFrameTime: number;
  layerIndexTime: number;
  compileSubmitTime: number;
  glyphAtlas: GlyphAtlasStats;
  backend: BackendStats;
};

export class Renderer implements DrawCommandSink {
  private _backend: RenderBackend | undefined;

  private screenSize: { width: number; height: number };
  private currentColor = 0;
  private renderStats: RenderStats;
  private layerVisibility: Map<string, boolean> = new Map();
  private readonly compiler = new DrawCommandCompiler();

  constructor(
    readonly imageRepo: ImageRepository,
    readonly textMetrics: TextMetrics,
    screenSize: { width: number; height: number },
  ) {
    this.glyphAtlas = new GlyphAtlas(textMetrics);
    this.screenSize = screenSize;
    this.renderStats = {
      frameCount: 0,
      totalLayers: 0,
      layerStats: [],
      lastFrameTime: 0,
      layerIndexTime: 0,
      compileSubmitTime: 0,
      glyphAtlas: this.glyphAtlas.getStats(),
      backend: { name: "None", instances: 0, instanceBytes: 0, dispatches: 0 },
    };
  }

  private readonly glyphAtlas: GlyphAtlas;

  get backend() {
    return this._backend;
  }

  set backend(backend: RenderBackend | undefined) {
    this._backend = backend;
    this.glyphAtlas.setBackend(backend);
  }

  resize(screenSize: { width: number; height: number; pixelRatio: number }) {
    this.screenSize = screenSize;
    this._backend?.resize(screenSize.width, screenSize.height, screenSize.pixelRatio);
  }

  render(view: DataView) {
    const backend = this._backend;
    if (!backend) return;

    const frameStartTime = performance.now();
    this.renderStats.frameCount++;
    this.renderStats.layerStats = [];
    this.glyphAtlas.resetFrameStats();

    backend.beginFrame();
    const indexStartTime = performance.now();
    const layers = this.compiler.index(view);
    this.renderStats.layerIndexTime = performance.now() - indexStartTime;
    this.renderStats.totalLayers = layers.length;

    const compileStartTime = performance.now();

    for (const layer of layers) {
      const layerKey = `${layer.layer}.${layer.sublayer}`;
      const isVisible = this.layerVisibility.get(layerKey) ?? true;

      const layerStats: LayerStats = {
        layer: layer.layer,
        sublayer: layer.sublayer,
        drawImageCount: layer.drawImageCount,
        drawImageQuadCount: layer.drawImageQuadCount,
        drawStringCount: layer.drawStringCount,
        totalCommands: layer.ranges.length,
      };

      if (isVisible) {
        backend.begin();
      }

      if (isVisible) this.compiler.compileLayer(layer, view, this);

      if (isVisible) {
        backend.end();
      }

      this.renderStats.layerStats.push(layerStats);
    }

    this.renderStats.compileSubmitTime = performance.now() - compileStartTime;
    this.renderStats.lastFrameTime = performance.now() - frameStartTime;
    this.renderStats.glyphAtlas = this.glyphAtlas.getStats();
    this.renderStats.backend = backend.getStats();
  }

  setViewport(x: number, y: number, width: number, height: number) {
    if (width === 0 || height === 0) this.backend?.setViewport(0, 0, this.screenSize.width, this.screenSize.height);
    else this.backend?.setViewport(x, y, width, height);
  }

  setColor(r: number, g: number, b: number, a: number) {
    this.currentColor = packColor(r, g, b, a);
  }

  setColorEscape(text: string) {
    const a = text.match(/^\^[0-9]/);
    if (a) {
      this.currentColor = colorEscape[Number.parseInt(a[0][1])];
      return text.substring(2);
    }
    const color = text.match(/^\^[xX][0-9a-fA-F]{6}/);
    if (color) {
      const r = Number.parseInt(color[0].substring(2, 4), 16);
      const g = Number.parseInt(color[0].substring(4, 6), 16);
      const b = Number.parseInt(color[0].substring(6, 8), 16);
      this.currentColor = packColor(r, g, b, 255);
      return text.substring(8);
    }
    return text;
  }

  drawImage(
    handle: number,
    x: number,
    y: number,
    width: number,
    height: number,
    s1: number,
    t1: number,
    s2: number,
    t2: number,
    stackLayer: number,
    maskLayer: number,
  ) {
    this.drawImageQuad(
      handle,
      x,
      y,
      x + width,
      y,
      x + width,
      y + height,
      x,
      y + height,
      s1,
      t1,
      s2,
      t1,
      s2,
      t2,
      s1,
      t2,
      stackLayer,
      maskLayer,
    );
  }

  drawImageQuad(
    handle: number,
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
    stackLayer: number,
    maskLayer: number,
  ) {
    if (handle === 0) {
      this.backend?.drawQuad(
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        x4,
        y4,
        0,
        0,
        1,
        0,
        1,
        1,
        0,
        1,
        WHITE_TEXTURE_BITMAP,
        this.currentColor,
        0,
        -1,
        false,
      );
    } else {
      const texture = this.imageRepo.get(handle);
      if (texture) {
        this.backend?.drawQuad(
          x1,
          y1,
          x2,
          y2,
          x3,
          y3,
          x4,
          y4,
          s1,
          t1,
          s2,
          t2,
          s3,
          t3,
          s4,
          t4,
          texture,
          this.currentColor,
          stackLayer,
          maskLayer,
          false,
        );
      }
    }
  }

  drawString(x: number, y: number, align: number, height: number, font: number, text: string) {
    const pos = { x, y };
    for (const line of text.split("\n")) {
      this.drawStringLine(pos, align, height, font, line);
    }
  }

  private drawStringLine(pos: { x: number; y: number }, align: number, height: number, font: number, text0: string) {
    const segments: { color: number; text: string; width: number }[] = [];

    let text = text0;
    while (true) {
      const m = reColor.exec(text);
      if (!m) break;

      const subtext = text.substring(0, m.index);
      text = text.substring(m.index + m[0].length);

      if (subtext.length > 0) {
        segments.push({
          color: this.currentColor,
          text: subtext,
          width: this.textMetrics.measure(height, font, subtext),
        });
      }

      if (m[1]) {
        this.currentColor = colorEscape[Number.parseInt(m[1])];
      } else {
        const r = Number.parseInt(m[2].substring(0, 2), 16);
        const g = Number.parseInt(m[2].substring(2, 4), 16);
        const b = Number.parseInt(m[2].substring(4, 6), 16);
        this.currentColor = packColor(r, g, b, 255);
      }
    }
    if (text.length > 0) {
      segments.push({ color: this.currentColor, text, width: this.textMetrics.measure(height, font, text) });
    }

    const width = segments.reduce((total, segment) => total + segment.width, 0);

    let x = pos.x;
    switch (align) {
      case 1: // CENTER
        x = Math.floor((this.screenSize.width - width) / 2 + pos.x);
        break;
      case 2: // RIGHT
        x = Math.floor(this.screenSize.width - width - pos.x);
        break;
      case 3: // CENTER_X
        x = Math.floor(pos.x - width / 2);
        break;
      case 4: // RIGHT_X
        x = Math.floor(pos.x - width);
        break;
    }

    for (const segment of segments) {
      this.glyphAtlas.draw(height, font, segment.text, x, pos.y, segment.color);
      x += segment.width;
    }

    pos.y += height;
  }

  getStats(): RenderStats {
    return {
      frameCount: this.renderStats.frameCount,
      totalLayers: this.renderStats.totalLayers,
      layerStats: [...this.renderStats.layerStats],
      lastFrameTime: this.renderStats.lastFrameTime,
      layerIndexTime: this.renderStats.layerIndexTime,
      compileSubmitTime: this.renderStats.compileSubmitTime,
      glyphAtlas: { ...this.renderStats.glyphAtlas },
      backend: { ...this.renderStats.backend },
    };
  }

  resetStats() {
    this.renderStats = {
      frameCount: 0,
      totalLayers: 0,
      layerStats: [],
      lastFrameTime: 0,
      layerIndexTime: 0,
      compileSubmitTime: 0,
      glyphAtlas: this.glyphAtlas.getStats(),
      backend: { name: "None", instances: 0, instanceBytes: 0, dispatches: 0 },
    };
  }

  getStatsSummary() {
    const totalDrawImage = this.renderStats.layerStats.reduce((sum, layer) => sum + layer.drawImageCount, 0);
    const totalDrawImageQuad = this.renderStats.layerStats.reduce((sum, layer) => sum + layer.drawImageQuadCount, 0);
    const totalDrawString = this.renderStats.layerStats.reduce((sum, layer) => sum + layer.drawStringCount, 0);
    const totalDrawCalls = totalDrawImage + totalDrawImageQuad + totalDrawString;

    return {
      frameCount: this.renderStats.frameCount,
      totalLayers: this.renderStats.totalLayers,
      totalDrawCalls,
      drawImage: totalDrawImage,
      drawImageQuad: totalDrawImageQuad,
      drawString: totalDrawString,
      avgFrameTime: this.renderStats.lastFrameTime,
    };
  }

  setLayerVisible(layer: number, sublayer: number, visible: boolean) {
    const layerKey = `${layer}.${sublayer}`;
    this.layerVisibility.set(layerKey, visible);
  }

  isLayerVisible(layer: number, sublayer: number): boolean {
    const layerKey = `${layer}.${sublayer}`;
    return this.layerVisibility.get(layerKey) ?? true;
  }

  getLayerVisibility(): Map<string, boolean> {
    return new Map(this.layerVisibility);
  }
}
