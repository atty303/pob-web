enum DrawCommandType {
  SetClearColor = 1,
  SetLayer = 2,
  SetViewport = 3,
  SetColor = 4,
  SetColorEscape = 5,
  DrawImage = 6,
  DrawImageQuad = 7,
  DrawString = 8,
}

export type CommandRange = { offset: number; length: number };

export type CompiledLayer = {
  readonly layer: number;
  readonly sublayer: number;
  readonly ranges: CommandRange[];
  readonly drawImageCount: number;
  readonly drawImageQuadCount: number;
  readonly drawStringCount: number;
};

export interface DrawCommandSink {
  setViewport(x: number, y: number, width: number, height: number): void;
  setColor(r: number, g: number, b: number, a: number): void;
  setColorEscape(text: string): void;
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
  ): void;
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
  ): void;
  drawString(x: number, y: number, align: number, height: number, font: number, text: string): void;
}

type MutableLayer = {
  layer: number;
  sublayer: number;
  ranges: CommandRange[];
  drawImageCount: number;
  drawImageQuadCount: number;
  drawStringCount: number;
};

function layerId(layer: number, sublayer: number) {
  return (layer << 16) | sublayer;
}

function addCommand(layer: MutableLayer, offset: number, length: number) {
  const lastRange = layer.ranges[layer.ranges.length - 1];
  if (lastRange && lastRange.offset + lastRange.length === offset) lastRange.length += length;
  else layer.ranges.push({ offset, length });
}

export class DrawCommandCompiler {
  private readonly decoder = new TextDecoder();

  index(view: DataView): CompiledLayer[] {
    const initial: MutableLayer = {
      layer: 0,
      sublayer: 0,
      ranges: [],
      drawImageCount: 0,
      drawImageQuadCount: 0,
      drawStringCount: 0,
    };
    const layers = new Map<number, MutableLayer>([[0, initial]]);
    let currentLayer = initial;
    let currentViewportOffset = -1;

    let offset = 0;
    while (offset < view.byteLength) {
      const commandStart = offset;
      switch (view.getUint8(offset)) {
        case DrawCommandType.SetLayer: {
          const layer = view.getInt16(offset + 1, true);
          const sublayer = view.getInt16(offset + 3, true);
          offset += 5;
          if (currentLayer.layer !== layer || currentLayer.sublayer !== sublayer) {
            const id = layerId(layer, sublayer);
            let target = layers.get(id);
            if (!target) {
              target = {
                layer,
                sublayer,
                ranges: [],
                drawImageCount: 0,
                drawImageQuadCount: 0,
                drawStringCount: 0,
              };
              layers.set(id, target);
            }
            currentLayer = target;
          }
          if (currentViewportOffset >= 0) addCommand(currentLayer, currentViewportOffset, 17);
          break;
        }
        case DrawCommandType.SetViewport:
          currentViewportOffset = commandStart;
          addCommand(currentLayer, commandStart, 17);
          offset += 17;
          break;
        case DrawCommandType.SetColor:
          addCommand(currentLayer, commandStart, 5);
          offset += 5;
          break;
        case DrawCommandType.SetColorEscape: {
          const length = 3 + view.getUint16(offset + 1, true);
          addCommand(currentLayer, commandStart, length);
          offset += length;
          break;
        }
        case DrawCommandType.DrawImage:
          addCommand(currentLayer, commandStart, 45);
          currentLayer.drawImageCount++;
          offset += 45;
          break;
        case DrawCommandType.DrawImageQuad:
          addCommand(currentLayer, commandStart, 77);
          currentLayer.drawImageQuadCount++;
          offset += 77;
          break;
        case DrawCommandType.DrawString: {
          const length = 17 + view.getUint16(offset + 15, true);
          addCommand(currentLayer, commandStart, length);
          currentLayer.drawStringCount++;
          offset += length;
          break;
        }
        default:
          throw new Error(`Unknown command type: ${view.getUint8(offset)}`);
      }
    }

    return [...layers.values()].sort((a, b) => layerId(a.layer, a.sublayer) - layerId(b.layer, b.sublayer));
  }

  compileLayer(layer: CompiledLayer, view: DataView, sink: DrawCommandSink) {
    for (const range of layer.ranges) {
      const end = range.offset + range.length;
      let offset = range.offset;
      while (offset < end) {
        switch (view.getUint8(offset)) {
          case DrawCommandType.SetViewport:
            sink.setViewport(
              view.getInt32(offset + 1, true),
              view.getInt32(offset + 5, true),
              view.getInt32(offset + 9, true),
              view.getInt32(offset + 13, true),
            );
            offset += 17;
            break;
          case DrawCommandType.SetColor:
            sink.setColor(
              view.getUint8(offset + 1),
              view.getUint8(offset + 2),
              view.getUint8(offset + 3),
              view.getUint8(offset + 4),
            );
            offset += 5;
            break;
          case DrawCommandType.SetColorEscape: {
            const length = view.getUint16(offset + 1, true);
            sink.setColorEscape(this.decode(view, offset + 3, length));
            offset += 3 + length;
            break;
          }
          case DrawCommandType.DrawImage:
            sink.drawImage(
              view.getInt32(offset + 1, true),
              view.getFloat32(offset + 5, true),
              view.getFloat32(offset + 9, true),
              view.getFloat32(offset + 13, true),
              view.getFloat32(offset + 17, true),
              view.getFloat32(offset + 21, true),
              view.getFloat32(offset + 25, true),
              view.getFloat32(offset + 29, true),
              view.getFloat32(offset + 33, true),
              view.getInt32(offset + 37, true),
              view.getInt32(offset + 41, true),
            );
            offset += 45;
            break;
          case DrawCommandType.DrawImageQuad:
            sink.drawImageQuad(
              view.getInt32(offset + 1, true),
              view.getFloat32(offset + 5, true),
              view.getFloat32(offset + 9, true),
              view.getFloat32(offset + 13, true),
              view.getFloat32(offset + 17, true),
              view.getFloat32(offset + 21, true),
              view.getFloat32(offset + 25, true),
              view.getFloat32(offset + 29, true),
              view.getFloat32(offset + 33, true),
              view.getFloat32(offset + 37, true),
              view.getFloat32(offset + 41, true),
              view.getFloat32(offset + 45, true),
              view.getFloat32(offset + 49, true),
              view.getFloat32(offset + 53, true),
              view.getFloat32(offset + 57, true),
              view.getFloat32(offset + 61, true),
              view.getFloat32(offset + 65, true),
              view.getInt32(offset + 69, true),
              view.getInt32(offset + 73, true),
            );
            offset += 77;
            break;
          case DrawCommandType.DrawString: {
            const length = view.getUint16(offset + 15, true);
            sink.drawString(
              view.getFloat32(offset + 1, true),
              view.getFloat32(offset + 5, true),
              view.getUint8(offset + 9),
              view.getUint32(offset + 10, true),
              view.getUint8(offset + 14),
              this.decode(view, offset + 17, length),
            );
            offset += 17 + length;
            break;
          }
          default:
            throw new Error(`Unexpected indexed command type: ${view.getUint8(offset)}`);
        }
      }
    }
  }

  private decode(view: DataView, offset: number, length: number) {
    return this.decoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset, length));
  }
}
