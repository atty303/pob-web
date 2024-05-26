import { DrawCommandInterpreter } from "../draw.ts";
import { type ImageRepository, TextureFlags } from "../image.ts";
import type { TextRasterizer, TextRender } from "./text.ts";
import type { WebGL1Backend } from "./webgl_backend.ts";

export type TextureBitmap = {
  id: string;
  bitmap: ImageBitmap | ImageData | OffscreenCanvas;
  flags: number;
  updateSubImage?: () => { x: number; y: number; width: number; height: number; source: ArrayBufferView };
};

const WHITE_TEXTURE_BITMAP = (() => {
  const image = new ImageData(8, 8);
  image.data.set(Array(8 * 8 * 4).fill(255));
  return { id: "@white", bitmap: image, flags: TextureFlags.TF_NOMIPMAP };
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

export class Renderer {
  backend: WebGL1Backend | undefined;

  private screenSize: { width: number; height: number };
  private currentColor: number[] = [0, 0, 0, 0];

  constructor(
    readonly imageRepo: ImageRepository,
    readonly textRasterizer: TextRasterizer,
    screenSize: { width: number; height: number },
  ) {
    this.screenSize = screenSize;
  }

  resize(screenSize: { width: number; height: number; pixelRatio: number }) {
    this.screenSize = screenSize;
    this.backend?.resize(screenSize.width, screenSize.height, screenSize.pixelRatio);
  }

  render(view: DataView) {
    if (!this.backend) return;

    const layers = DrawCommandInterpreter.sort(view);
    for (const layer of layers) {
      this.setColor(1, 1, 1, 1);
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
          ) => {
            this.drawImage(handle, x, y, width, height, s1, t1, s2, t2);
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
          ) => {
            this.drawImageQuad(handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4);
          },
          onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => {
            this.drawString(x, y, align, height, font, text);
          },
        });
      }
      this.backend.end();
    }
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
  ) {
    if (handle === 0) {
      this.backend?.drawQuad(
        [x1, y1, x2, y2, x3, y3, x4, y4],
        [0, 0, 1, 0, 1, 1, 0, 1],
        WHITE_TEXTURE_BITMAP,
        this.currentColor,
      );
    } else {
      const image = this.imageRepo.get(handle);
      if (image?.bitmap) {
        this.backend?.drawQuad(
          [x1, y1, x2, y2, x3, y3, x4, y4],
          [s1, t1, s2, t2, s3, t3, s4, t4],
          { id: handle.toString(), bitmap: image.bitmap, flags: image.flags },
          this.currentColor,
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
      if (m[1]) {
        this.currentColor = colorEscape[Number.parseInt(m[1])];
      } else {
        const r = Number.parseInt(m[2].substring(0, 2), 16);
        const g = Number.parseInt(m[2].substring(2, 4), 16);
        const b = Number.parseInt(m[2].substring(4, 6), 16);
        this.currentColor = [r / 255, g / 255, b / 255, 1];
      }

      if (subtext.length > 0) {
        for (const render of this.textRasterizer.get(height, font, subtext)) {
          segments.push({
            color: this.currentColor,
            render,
          });
        }
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
        );
      }
      x += segment.render.width;
    }

    pos.y += height;
  }
}
