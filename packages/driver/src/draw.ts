export class DrawCommandInterpreter {
    private readonly view: DataView;

    constructor(buffer: ArrayBufferLike, byteOffset: number, byteLength: number) {
        this.view = new DataView(buffer, byteOffset, byteLength);
    }

    run(cb: {
        onSetLayer: (layer: number, sublayer: number) => void,
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
                case 2: {
                    const layer = view.getUint16(i, true);
                    i += 2;
                    const sublayer = view.getUint16(i, true);
                    i += 2;
                    cb.onSetLayer(layer, sublayer);
                }
                    break;
                case 4: {
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
                case 6: {
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
                case 7: {
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
                case 8: {
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
                    const text = textDecoder.decode(textArray);
                    cb.onDrawString(x, y, align, height, font, text);
                }
                    break;
            }
        }
    }
}