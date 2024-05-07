const enum DrawCommandType {
    SetLayer = 2,
    SetColor = 4,
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

    private readonly buffer: ArrayBuffer;
    private readonly array: Uint8Array;
    private offset: number;

    get id(): number {
        return Layer.idOf(this.layer, this.sublayer);
    }

    get commands(): Uint8Array {
        return new Uint8Array(this.buffer, 0, this.offset);
    }

    constructor(layer: number, sublayer: number) {
        this.layer = layer;
        this.sublayer = sublayer;

        this.buffer = new ArrayBuffer(1024 * 1024, { maxByteLength: 16384 * 1024 });
        this.array = new Uint8Array(this.buffer);
        this.offset = 0;
    }

    push(command: Uint8Array) {
        if (this.offset + command.length > this.array.length) {
            this.buffer.resize(this.buffer.byteLength * 2);
        }
        this.array.set(command, this.offset);
        this.offset += command.length;
    }

}

export class DrawCommandInterpreter {
    private readonly view: DataView;

    constructor(buffer: ArrayBufferLike, byteOffset: number, byteLength: number) {
        this.view = new DataView(buffer, byteOffset, byteLength);
    }

    sort() {
        const layers = new Map<number, Layer>([[0, new Layer(0, 0)]]);
        let currentLayer = layers.get(0)!;

        const view = this.view;
        let i = 0;
        while (i < view.byteLength) {
            const commandType = view.getUint8(i);
            switch (commandType) {
                case DrawCommandType.SetLayer:
                    const layer = this.view.getUint16(i + 1, true);
                    const sublayer = this.view.getUint16(i + 3, true);
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
                    const textSize = this.view.getUint16(i + 12, true);
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

    run(cb: {
        onSetColor: (r: number, g: number, b: number, a: number) => void,
        onDrawImage: (handle: number, x: number, y: number, width: number, height: number, s1: number, t1: number, s2: number, t2: number) => void,
        onDrawImageQuad: (handle: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, s1: number, t1: number, s2: number, t2: number, s3: number, t3: number, s4: number, t4: number) => void,
        onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => void,
    }) {
        const textDecoder = new TextDecoder();
        const view = this.view;
        const size = view.byteLength;
        let i = 0;
        while (i < size) {
            const commandType = view.getUint8(i);
            i += 1;
            switch (commandType) {
                case DrawCommandType.SetColor: {
                    const r = view.getUint8(i);
                    i += 1;
                    const g = view.getUint8(i);
                    i += 1;
                    const b = view.getUint8(i);
                    i += 1;
                    const a = view.getUint8(i);
                    i += 1;
                    cb.onSetColor(r, g, b, a);
                }
                    break;
                case DrawCommandType.DrawImage: {
                    const handle = view.getInt32(i, true);
                    i += 4;
                    const x = view.getFloat32(i, true);
                    i += 4;
                    const y = view.getFloat32(i, true);
                    i += 4;
                    const width = view.getFloat32(i, true);
                    i += 4;
                    const height = view.getFloat32(i, true);
                    i += 4;
                    const s1 = view.getFloat32(i, true);
                    i += 4;
                    const t1 = view.getFloat32(i, true);
                    i += 4;
                    const s2 = view.getFloat32(i, true);
                    i += 4;
                    const t2 = view.getFloat32(i, true);
                    i += 4;
                    cb.onDrawImage(handle, x, y, width, height, s1, t1, s2, t2);
                }
                    break;
                case DrawCommandType.DrawImageQuad: {
                    const handle = view.getInt32(i, true);
                    i += 4;
                    const x1 = view.getFloat32(i, true);
                    i += 4;
                    const y1 = view.getFloat32(i, true);
                    i += 4;
                    const x2 = view.getFloat32(i, true);
                    i += 4;
                    const y2 = view.getFloat32(i, true);
                    i += 4;
                    const x3 = view.getFloat32(i, true);
                    i += 4;
                    const y3 = view.getFloat32(i, true);
                    i += 4;
                    const x4 = view.getFloat32(i, true);
                    i += 4;
                    const y4 = view.getFloat32(i, true);
                    i += 4;
                    const s1 = view.getFloat32(i, true);
                    i += 4;
                    const t1 = view.getFloat32(i, true);
                    i += 4;
                    const s2 = view.getFloat32(i, true);
                    i += 4;
                    const t2 = view.getFloat32(i, true);
                    i += 4;
                    const s3 = view.getFloat32(i, true);
                    i += 4;
                    const t3 = view.getFloat32(i, true);
                    i += 4;
                    const s4 = view.getFloat32(i, true);
                    i += 4;
                    const t4 = view.getFloat32(i, true);
                    i += 4;
                    cb.onDrawImageQuad(handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4);
                }
                    break;
                case DrawCommandType.DrawString: {
                    const x = view.getFloat32(i, true);
                    i += 4;
                    const y = view.getFloat32(i, true);
                    i += 4;
                    const align = view.getUint8(i);
                    i += 1;
                    const height = view.getUint8(i);
                    i += 1;
                    const font = view.getUint8(i);
                    i += 1;
                    const textSize = view.getUint16(i, true);
                    i += 2;
                    const textArray = new Uint8Array(view.buffer, view.byteOffset + i, textSize);
                    i += textSize;
                    const text = textDecoder.decode(textArray.slice());
                    cb.onDrawString(x, y, align, height, font, text);
                }
                    break;
            }
        }
    }
}