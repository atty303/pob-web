const enum DrawCommandType {
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

export class DrawCommandInterpreter {
    static sort(view: DataView) {
        const layers = new Map<number, Layer>([[0, new Layer(0, 0)]]);
        let currentLayer = layers.get(0)!;

        let i = 0;
        while (i < view.byteLength) {
            const commandType = view.getUint8(i);
            switch (commandType) {
                case DrawCommandType.SetLayer:
                    const layer = view.getInt16(i + 1, true);
                    const sublayer = view.getInt16(i + 3, true);
                    i += 5;

                    if (currentLayer.layer != layer || currentLayer.sublayer != sublayer) {
                        const l = layers.get(Layer.idOf(layer, sublayer));
                        if (l) {
                            currentLayer = l;
                        } else {
                            const n = new Layer(layer, sublayer);
                            layers.set(n.id, n);
                            currentLayer = n;
                        }
                    }
                    // TODO: SetViewport(&curViewport);
                    // TODO: SetBlendMode(curBlendMode);
                    break;
                case DrawCommandType.SetViewport:
                    currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 17));
                    i += 17;
                    break;
                case DrawCommandType.SetColor:
                    currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 5));
                    i += 5;
                    break;
                case DrawCommandType.DrawImage:
                    currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 37));
                    i += 37;
                    break;
                case DrawCommandType.DrawImageQuad:
                    currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 69));
                    i += 69;
                    break;
                case DrawCommandType.DrawString:
                    const textSize = view.getUint16(i + 12, true);
                    currentLayer.push(new Uint8Array(view.buffer, view.byteOffset + i, 14 + textSize));
                    i += 14 + textSize;
                    break;
                default:
                    throw new Error(`Unknown command type: ${commandType}`);
            }
        }

        const keys = [...layers.keys()];
        keys.sort((a, b) => a - b);
        return keys.map((key) => layers.get(key)!);
    }

    static run(command: Uint8Array, cb: {
        onSetViewport: (x: number, y: number, width: number, height: number) => void,
        onSetColor: (r: number, g: number, b: number, a: number) => void,
        onDrawImage: (handle: number, x: number, y: number, width: number, height: number, s1: number, t1: number, s2: number, t2: number) => void,
        onDrawImageQuad: (handle: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, s1: number, t1: number, s2: number, t2: number, s3: number, t3: number, s4: number, t4: number) => void,
        onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => void,
    }) {

        const view = new DataView(command.buffer, command.byteOffset, command.byteLength);
        const commandType = view.getUint8(0);
        switch (commandType) {
            case DrawCommandType.SetViewport: {
                const x = view.getInt32(1, true);
                const y = view.getInt32(5, true);
                const width = view.getInt32(9, true);
                const height = view.getInt32(13, true);
                cb.onSetViewport(x, y, width, height);
            } break;
            case DrawCommandType.SetColor: {
                const r = view.getUint8(1);
                const g = view.getUint8(2);
                const b = view.getUint8(3);
                const a = view.getUint8(4);
                cb.onSetColor(r, g, b, a);
            } break;
            case DrawCommandType.DrawImage: {
                const handle = view.getInt32(1, true);
                const x = view.getFloat32(5, true);
                const y = view.getFloat32(9, true);
                const width = view.getFloat32(13, true);
                const height = view.getFloat32(17, true);
                const s1 = view.getFloat32(21, true);
                const t1 = view.getFloat32(25, true);
                const s2 = view.getFloat32(29, true);
                const t2 = view.getFloat32(33, true);
                cb.onDrawImage(handle, x, y, width, height, s1, t1, s2, t2);
            } break;
            case DrawCommandType.DrawImageQuad: {
                const handle = view.getInt32(1, true);
                const x1 = view.getFloat32(5, true);
                const y1 = view.getFloat32(9, true);
                const x2 = view.getFloat32(13, true);
                const y2 = view.getFloat32(17, true);
                const x3 = view.getFloat32(21, true);
                const y3 = view.getFloat32(25, true);
                const x4 = view.getFloat32(29, true);
                const y4 = view.getFloat32(33, true);
                const s1 = view.getFloat32(37, true);
                const t1 = view.getFloat32(41, true);
                const s2 = view.getFloat32(45, true);
                const t2 = view.getFloat32(49, true);
                const s3 = view.getFloat32(53, true);
                const t3 = view.getFloat32(57, true);
                const s4 = view.getFloat32(61, true);
                const t4 = view.getFloat32(65, true);
                cb.onDrawImageQuad(handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4);
            } break;
            case DrawCommandType.DrawString: {
                const x = view.getFloat32(1, true);
                const y = view.getFloat32(5, true);
                const align = view.getUint8(9);
                const height = view.getUint8(10);
                const font = view.getUint8(11);
                const textSize = view.getUint16(12, true);
                const textArray = new Uint8Array(view.buffer, view.byteOffset + 14, textSize);
                const text = new TextDecoder().decode(textArray);
                cb.onDrawString(x, y, align, height, font, text);
            } break;
        }
    }
}