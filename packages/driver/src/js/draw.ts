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

class Layer {
  static idOf(layer: number, sublayer: number) {
    return (layer << 16) | sublayer;
  }

  readonly layer: number;
  readonly sublayer: number;
  readonly commands: Uint8Array[] = [];

  get id(): number {
    return Layer.idOf(this.layer, this.sublayer);
  }

  constructor(layer: number, sublayer: number) {
    this.layer = layer;
    this.sublayer = sublayer;
  }

  push(command: Uint8Array) {
    this.commands.push(command);
  }
}

export namespace DrawCommandInterpreter {
  export function sort(view: DataView) {
    const layers = new Map<number, Layer>([[0, new Layer(0, 0)]]);
    let currentLayer = layers.get(0)!;
    let currentViewport: Uint8Array | undefined = undefined;

    let i = 0;
    while (i < view.byteLength) {
      const commandType = view.getInt32(i, true);
      switch (commandType) {
        case DrawCommandType.SetLayer: {
          const layer = view.getInt32(i + 4, true);
          const sublayer = view.getInt32(i + 8, true);
          i += 12;

          if (currentLayer.layer !== layer || currentLayer.sublayer !== sublayer) {
            const l = layers.get(Layer.idOf(layer, sublayer));
            if (l) {
              currentLayer = l;
            } else {
              const n = new Layer(layer, sublayer);
              layers.set(n.id, n);
              currentLayer = n;
            }
          }
          if (currentViewport) {
            currentLayer.push(currentViewport);
          }
          break;
        }
        case DrawCommandType.SetViewport: {
          const c = new Uint8Array(view.buffer, view.byteOffset + i, 20);
          currentViewport = c;
          currentLayer.push(c);
          i += 20;
          break;
        }
        case DrawCommandType.SetColor: {
          currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 20));
          i += 20;
          break;
        }
        case DrawCommandType.SetColorEscape: {
          const textSize0 = view.getInt32(i + 4, true);
          currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 8 + textSize0));
          i += 8 + textSize0;
          break;
        }
        case DrawCommandType.DrawImage: {
          currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 48));
          i += 48;
          break;
        }
        case DrawCommandType.DrawImageQuad: {
          currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 80));
          i += 80;
          break;
        }
        case DrawCommandType.DrawString: {
          const textSize = view.getInt32(i + 24, true);
          currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 28 + textSize));
          i += 28 + textSize;
          break;
        }
        default:
          throw new Error(`Unknown command type: ${commandType}`);
      }
    }

    const keys = [...layers.keys()];
    keys.sort((a, b) => {
      return a - b;
      // const aLayer = a >> 16;
      // const aSublayer = a & 0xFFFF;
      // const bLayer = b >> 16;
      // const bSublayer = b & 0xFFFF;
      // if (aLayer < bLayer) {
      //     return -1;
      // } else if (aLayer > bLayer) {
      //     return 1;
      // } else if (aSublayer < bSublayer) {
      //     return -1;
      // } else {
      //     return 1;
      // }
    });
    return keys.flatMap(key => {
      const l = layers.get(key)!;
      // console.log(l);
      // return (l.layer === 5 && l.sublayer === 0) ? [l] : [];
      return [l];
    });
  }

  export function run(
    command: Uint8Array,
    cb: {
      onSetViewport: (x: number, y: number, width: number, height: number) => void;
      onSetColor: (r: number, g: number, b: number, a: number) => void;
      onSetColorEscape: (text: string) => void;
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
      ) => void;
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
      ) => void;
      onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => void;
    },
  ) {
    const view = new DataView(command.buffer, command.byteOffset, command.byteLength);
    const commandType = view.getInt32(0, true);
    switch (commandType) {
      case DrawCommandType.SetViewport:
        {
          const x = view.getInt32(1, true);
          const y = view.getInt32(5, true);
          const width = view.getInt32(9, true);
          const height = view.getInt32(13, true);
          cb.onSetViewport(x, y, width, height);
        }
        break;
      case DrawCommandType.SetColor:
        {
          const r = view.getInt32(4, true);
          const g = view.getInt32(8, true);
          const b = view.getInt32(12, true);
          const a = view.getInt32(16, true);
          cb.onSetColor(r, g, b, a);
        }
        break;
      case DrawCommandType.SetColorEscape:
        {
          const textSize = view.getInt32(4, true);
          const textArray = new Uint8Array(view.buffer, view.byteOffset + 8, textSize);
          const text = new TextDecoder().decode(textArray);
          cb.onSetColorEscape(text);
        }
        break;
      case DrawCommandType.DrawImage:
        {
          const handle = view.getInt32(4, true);
          const x = view.getFloat32(8, true);
          const y = view.getFloat32(12, true);
          const width = view.getFloat32(16, true);
          const height = view.getFloat32(20, true);
          const s1 = view.getFloat32(24, true);
          const t1 = view.getFloat32(28, true);
          const s2 = view.getFloat32(32, true);
          const t2 = view.getFloat32(36, true);
          const stackLayer = view.getInt32(40, true);
          const maskLayer = view.getInt32(44, true);
          cb.onDrawImage(handle, x, y, width, height, s1, t1, s2, t2, stackLayer, maskLayer);
        }
        break;
      case DrawCommandType.DrawImageQuad:
        {
          const handle = view.getInt32(4, true);
          const x1 = view.getFloat32(8, true);
          const y1 = view.getFloat32(12, true);
          const x2 = view.getFloat32(16, true);
          const y2 = view.getFloat32(20, true);
          const x3 = view.getFloat32(24, true);
          const y3 = view.getFloat32(28, true);
          const x4 = view.getFloat32(32, true);
          const y4 = view.getFloat32(36, true);
          const s1 = view.getFloat32(40, true);
          const t1 = view.getFloat32(44, true);
          const s2 = view.getFloat32(48, true);
          const t2 = view.getFloat32(52, true);
          const s3 = view.getFloat32(56, true);
          const t3 = view.getFloat32(60, true);
          const s4 = view.getFloat32(64, true);
          const t4 = view.getFloat32(68, true);
          const stackLayer = view.getInt32(72, true);
          const maskLayer = view.getInt32(76, true);
          cb.onDrawImageQuad(
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
        }
        break;
      case DrawCommandType.DrawString:
        {
          const x = view.getFloat32(4, true);
          const y = view.getFloat32(8, true);
          const align = view.getInt32(12, true);
          const height = view.getInt32(16, true);
          const font = view.getInt32(20, true);
          const textSize = view.getInt32(24, true);
          const textArray = new Uint8Array(view.buffer, view.byteOffset + 28, textSize);
          const text = new TextDecoder().decode(textArray);
          cb.onDrawString(x, y, align, height, font, text);
        }
        break;
    }
  }
}
