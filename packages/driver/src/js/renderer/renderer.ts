import { Format, Target, Texture } from "dds/src";
import { DrawCommandInterpreter } from "../draw";
import { type ImageRepository, TextureFlags, TextureSource } from "../image";
import type { RenderBackend } from "./backend";
import type { TextRasterizer, TextRender } from "./text";

export type TextureBitmap = {
  id: string;
  source: TextureSource;
  updateSubImage?: () => { x: number; y: number; width: number; height: number; source: ArrayBufferView };
};

const WHITE_TEXTURE_BITMAP: TextureBitmap = (() => {
  const tex = new Texture(Target.TARGET_2D_ARRAY, Format.RGBA8_UNORM_PACK8, [8, 8, 1], 1, 1, 1);
  const arr = new Uint8Array(8 * 8 * 4).fill(255);
  tex.data = new DataView(arr.buffer);
  return {
    id: "@white",
    source: TextureSource.newTexture(tex, TextureFlags.TF_NOMIPMAP),
  };
})();

const BLACK_TEXTURE_BITMAP: TextureBitmap = (() => {
  const image = new ImageData(8, 8);
  image.data.set(Array(8 * 8 * 4).fill(0));
  return {
    id: "@black",
    source: TextureSource.newImage(image, TextureFlags.TF_NOMIPMAP),
  };
})();

const reColor = /\^([0-9])|\^[xX]([0-9a-fA-F]{6})/;
const colorEscape = [
  [0, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1],
  [1, 1, 0, 1],
  [1, 0, 1, 1],
  [0, 1, 1, 1],
  [1, 1, 1, 1],
  [0.7, 0.7, 0.7, 1],
  [0.4, 0.4, 0.4, 1],
];

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
};

export class Renderer {
  backend: RenderBackend | undefined;

  private screenSize: { width: number; height: number };
  private currentColor: number[] = [0, 0, 0, 0];
  private renderStats: RenderStats;

  constructor(
    readonly imageRepo: ImageRepository,
    readonly textRasterizer: TextRasterizer,
    screenSize: { width: number; height: number },
  ) {
    this.screenSize = screenSize;
    this.renderStats = {
      frameCount: 0,
      totalLayers: 0,
      layerStats: [],
      lastFrameTime: 0,
    };
  }

  resize(screenSize: { width: number; height: number; pixelRatio: number }) {
    this.screenSize = screenSize;
    this.backend?.resize(screenSize.width, screenSize.height, screenSize.pixelRatio);
  }

  render(view: DataView) {
    if (!this.backend) return;

    const frameStartTime = performance.now();
    this.renderStats.frameCount++;
    this.renderStats.layerStats = [];

    this.backend.beginFrame();
    const layers = DrawCommandInterpreter.sort(view);
    this.renderStats.totalLayers = layers.length;

    for (const layer of layers) {
      const layerStats: LayerStats = {
        layer: layer.layer,
        sublayer: layer.sublayer,
        drawImageCount: 0,
        drawImageQuadCount: 0,
        drawStringCount: 0,
        totalCommands: layer.commands.length,
      };

      this.backend.begin();
      for (const buffer of layer.commands) {
        DrawCommandInterpreter.run(buffer, {
          onSetViewport: (x: number, y: number, width: number, height: number) => {
            if (width === 0 || height === 0) {
              this.setViewport(0, 0, this.screenSize.width, this.screenSize.height);
            } else {
              this.setViewport(x, y, width, height);
            }
          },
          onSetColor: (r: number, g: number, b: number, a: number) => {
            this.setColor(r, g, b, a);
          },
          onSetColorEscape: (text: string) => {
            this.setColorEscape(text);
          },
          onDrawImage: (
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
          ) => {
            layerStats.drawImageCount++;
            this.drawImage(handle, x, y, width, height, s1, t1, s2, t2, stackLayer, maskLayer);
          },
          onDrawImageQuad: (
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
          ) => {
            layerStats.drawImageQuadCount++;
            this.drawImageQuad(
              handle,
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
              stackLayer,
              maskLayer,
            );
          },
          onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => {
            layerStats.drawStringCount++;
            this.drawString(x, y, align, height, font, text);
          },
        });
      }
      this.backend.end();

      this.renderStats.layerStats.push(layerStats);
    }

    this.renderStats.lastFrameTime = performance.now() - frameStartTime;
  }

  private setViewport(x: number, y: number, width: number, height: number) {
    this.backend?.setViewport(x, y, width, height);
  }

  private setColor(r: number, g: number, b: number, a: number) {
    this.currentColor = [r / 255, g / 255, b / 255, a / 255];
  }

  private setColorEscape(text: string) {
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
      this.currentColor = [r / 255, g / 255, b / 255, 1];
      return text.substring(8);
    }
    return text;
  }

  private drawImage(
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

  private drawImageQuad(
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
        [x1, y1, x2, y2, x3, y3, x4, y4],
        [0, 0, 1, 0, 1, 1, 0, 1],
        WHITE_TEXTURE_BITMAP,
        this.currentColor,
        0,
        -1,
      );
    } else {
      const texSource = this.imageRepo.get(handle);
      if (texSource) {
        this.backend?.drawQuad(
          [x1, y1, x2, y2, x3, y3, x4, y4],
          [s1, t1, s2, t2, s3, t3, s4, t4],
          { id: handle.toString(), source: texSource },
          this.currentColor,
          stackLayer,
          maskLayer,
        );
      }
    }
  }

  private drawString(x: number, y: number, align: number, height: number, font: number, text: string) {
    const pos = { x, y };
    for (const line of text.split("\n")) {
      this.drawStringLine(pos, align, height, font, line);
    }
  }

  private drawStringLine(pos: { x: number; y: number }, align: number, height: number, font: number, text0: string) {
    const segments: { color: number[]; render: TextRender }[] = [];

    let text = text0;
    while (true) {
      const m = reColor.exec(text);
      if (!m) break;

      const subtext = text.substring(0, m.index);
      text = text.substring(m.index + m[0].length);

      if (subtext.length > 0) {
        for (const render of this.textRasterizer.get(height, font, subtext)) {
          segments.push({
            color: this.currentColor,
            render,
          });
        }
      }

      if (m[1]) {
        this.currentColor = colorEscape[Number.parseInt(m[1])];
      } else {
        const r = Number.parseInt(m[2].substring(0, 2), 16);
        const g = Number.parseInt(m[2].substring(2, 4), 16);
        const b = Number.parseInt(m[2].substring(4, 6), 16);
        this.currentColor = [r / 255, g / 255, b / 255, 1];
      }
    }
    if (text.length > 0) {
      for (const render of this.textRasterizer.get(height, font, text)) {
        segments.push({
          color: this.currentColor,
          render,
        });
      }
    }

    const width = segments.reduce((width, segment) => width + segment.render.width, 0);

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
      if (segment.render.bitmap) {
        this.backend?.drawQuad(
          [x, pos.y, x + segment.render.width, pos.y, x + segment.render.width, pos.y + height, x, pos.y + height],
          segment.render.coords,
          segment.render.bitmap,
          segment.color,
          0,
          -1,
        );
      }
      x += segment.render.width;
    }

    pos.y += height;
  }

  // Get rendering statistics
  getStats(): RenderStats {
    return {
      frameCount: this.renderStats.frameCount,
      totalLayers: this.renderStats.totalLayers,
      layerStats: [...this.renderStats.layerStats],
      lastFrameTime: this.renderStats.lastFrameTime,
    };
  }

  // Reset statistics
  resetStats() {
    this.renderStats = {
      frameCount: 0,
      totalLayers: 0,
      layerStats: [],
      lastFrameTime: 0,
    };
  }

  // Get summary statistics
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
}
