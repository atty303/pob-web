import {ImageRepository} from "./image";
import {DrawCommandInterpreter} from "./draw.ts";

type TextureBitmap = {
    id: string;
    bitmap: ImageBitmap | ImageData;
};

const vertexShaderSource = `
uniform mat4 u_MvpMatrix;

attribute vec2 a_Position;
attribute vec2 a_TexCoord;
attribute vec4 a_TintColor;
attribute vec4 a_Viewport;
attribute float a_TexId;

varying vec2 v_ScreenPos;
varying vec2 v_TexCoord;
varying vec4 v_TintColor;
varying vec4 v_Viewport;
varying float v_TexId;

void main(void) {
    v_TexCoord = a_TexCoord;
    v_TintColor = a_TintColor;
    v_TexId = a_TexId;
    vec2 vp0 = a_Viewport.xy + vec2(0.0, a_Viewport.w);
    vec2 vp1 = a_Viewport.xy + vec2(a_Viewport.z, 0.0);
    v_Viewport = vec4(
      (u_MvpMatrix * vec4(vp0, 0.0, 1.0)).xy,
     (u_MvpMatrix * vec4(vp1, 0.0, 1.0)).xy);
    vec4 pos = u_MvpMatrix * vec4(a_Position + a_Viewport.xy, 0.0, 1.0);
    v_ScreenPos = pos.xy;
    gl_Position = pos;
}
`;

const textureFragmentShaderSource = ((max: number) => {
    let switchCode = "";
    for (let i = 0; i < max; ++i) {
        if (i == 0) {
            switchCode += `if (v_TexId < ${i}.5) `;
        } else if (i == max - 1) {
            switchCode += `else `;
        } else {
            switchCode += `else if (v_TexId < ${i}.5) `;
        }
        switchCode += `color = texture2D(u_Texture[${i}], v_TexCoord);\n`;
    }
    return `
precision mediump float;

uniform sampler2D u_Texture[${max}];

varying vec2 v_ScreenPos;
varying vec2 v_TexCoord;
varying vec4 v_TintColor;
varying vec4 v_Viewport;
varying float v_TexId;

void main(void) {
    float x = v_ScreenPos[0], y = v_ScreenPos[1];
    if (x < v_Viewport[0] || x >= v_Viewport[2] || y < v_Viewport[1] || y >= v_Viewport[3]) {
      discard;
    }
    vec4 color;
    ${switchCode}
    gl_FragColor = color * v_TintColor;
}
`;
});

class ShaderProgram<T> {
    private readonly gl: WebGLRenderingContext;
    private readonly program: WebGLProgram;
    private readonly locations: T;

    constructor(gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string, bindLocations: (_: WebGLProgram) => T) {
        this.gl = gl;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        const program = gl.createProgram();
        if (!program) throw new Error("Failed to create program");
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Failed to link program: " + gl.getProgramInfoLog(program));
        }

        this.locations = bindLocations(program);

        this.program = program;
    }

    use(set: (locations: T) => void) {
        this.gl.useProgram(this.program);
        set(this.locations);
    }

    private createShader(type: number, source: string): WebGLShader {
        const gl = this.gl;

        const shader = gl.createShader(type);
        if (!shader) throw new Error("Failed to create shader");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error("Failed to compile shader: " + gl.getShaderInfoLog(shader));
        }

        return shader;
    }
}

function orthoMatrix(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    return [
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, -2 / (far - near), 0,
        -((right + left)  / (right - left)), -((top + bottom) / (top - bottom)), -((far + near) / (far - near)), 1,
    ];
}

class VertexBuffer {
    private _buffer: Float32Array;
    private offset: number;

    constructor() {
        // TODO: Use a dynamic buffer
        this._buffer = new Float32Array( 512 * 1024);
        this.offset = 0;
    }

    get buffer() {
        return this._buffer.slice(0, this.offset);
    }

    get length() {
        return this.offset / 13;
    }

    push(i: number, coords: number[], texCoords: number[], tintColor: number[], viewport: number[], textureSlot: number) {
        const b = this._buffer;
        b[this.offset++] = coords[i * 2];
        b[this.offset++] = coords[i * 2 + 1];
        b[this.offset++] = texCoords[i * 2];
        b[this.offset++] = texCoords[i * 2 + 1];
        b[this.offset++] = tintColor[0];
        b[this.offset++] = tintColor[1];
        b[this.offset++] = tintColor[2];
        b[this.offset++] = tintColor[3];
        b[this.offset++] = viewport[0];
        b[this.offset++] = viewport[1];
        b[this.offset++] = viewport[2];
        b[this.offset++] = viewport[3];
        b[this.offset++] = textureSlot;
    }
}

class Canvas {
    private readonly gl: WebGLRenderingContext;

    private readonly textureProgram: ShaderProgram<{
        position: number, texCoord: number, tintColor: number, viewport: number, texId: number,
        mvpMatrix: WebGLUniformLocation, textures: WebGLUniformLocation[]
    }>;

    private readonly textures: Map<string, WebGLTexture>  = new Map();
    private viewport: number[] = [];
    private vertices: VertexBuffer = new VertexBuffer();
    private drawCount: number = 0;
    private readonly vbo: WebGLBuffer;
    private readonly maxTextures: number;
    private batchTextures: Map<string, TextureBitmap & { index: number }> = new Map();
    private batchTextureCount: number = 0;
    private dispatchCount: number = 0;

    get element(): HTMLCanvasElement {
        return this._element;
    }
    private readonly _element: HTMLCanvasElement;

    constructor(width: number, height: number) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = "absolute";
        this._element = canvas;

        const gl = canvas.getContext("webgl", { premultipliedAlpha: true });
        if (!gl) throw new Error("Failed to get WebGL context");
        this.gl = gl;

        gl.clearColor(0, 0, 0, 1);
        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);

        this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;
        console.log(`Max textures: ${this.maxTextures}`);

        this.textureProgram = new ShaderProgram(gl, vertexShaderSource, textureFragmentShaderSource(this.maxTextures), (program) => {
            const position = gl.getAttribLocation(program, "a_Position");
            if (position < 0) throw new Error("Failed to get attribute location");

            const texCoord = gl.getAttribLocation(program, "a_TexCoord");
            if (texCoord < 0) throw new Error("Failed to get attribute location");

            const tintColor = gl.getAttribLocation(program, "a_TintColor");
            if (tintColor < 0) throw new Error("Failed to get attribute location: tintColor");

            const viewport = gl.getAttribLocation(program, "a_Viewport");
            if (viewport < 0) throw new Error("Failed to get attribute location: viewport");

            const texId = gl.getAttribLocation(program, "a_TexId");
            if (texId < 0) throw new Error("Failed to get attribute location: texId");

            const mvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
            if (!mvpMatrix) throw new Error("Failed to get uniform location: mvpMatrix");

            let textures = [];
            for (let i = 0; i < this.maxTextures; ++i) {
                const texture = gl.getUniformLocation(program, `u_Texture[${i}]`);
                if (!texture) throw new Error("Failed to get uniform location: texture");
                textures.push(texture);
            }

            return {
                position,
                texCoord,
                tintColor,
                viewport,
                texId,
                mvpMatrix,
                textures,
            };
        });

        const vbo = gl.createBuffer();
        if (!vbo) throw new Error("Failed to create vertex buffer");
        this.vbo = vbo;

        // Set up the viewport
        this.setViewport(0, 0, width, height);
    }

    resize(width: number, height: number) {
        this._element.width = width;
        this._element.height = height;
        this.setViewport(0, 0, width, height);
    }

    setViewport(x: number, y: number, width: number, height: number) {
        this.viewport = [x, y, width, height];
    }

    begin() {
        this.vertices = new VertexBuffer();
        this.drawCount = 0;
        this.dispatchCount = 0;
    }

    end() {
        this.dispatch();
        // console.log(`Draw count: ${this.drawCount}, Dispatch count: ${this.dispatchCount}`);
    }

    drawQuad(coords: number[], texCoords: number[], textureBitmap: TextureBitmap, tintColor: number[]) {
        this.drawCount++;

        let t = this.batchTextures.get(textureBitmap.id);
        if (!t) {
            if (this.batchTextures.size >= this.maxTextures) {
                this.dispatch();
            }
            t = {...textureBitmap, index: this.batchTextureCount++}
            this.batchTextures.set(textureBitmap.id, t);
        }

        for (let i of [0, 1, 2, 0, 2, 3]) {
            this.vertices.push(i, coords, texCoords, tintColor, this.viewport, t.index);
        }
    }

    private dispatch() {
        if (this.vertices.length === 0) return;

        this.dispatchCount++;

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices.buffer, gl.STREAM_DRAW);
        this.textureProgram.use(p => {
            // Set up the viewport
            this.gl.viewport(0, 0, this.element.width, this.element.height);
            const matrix = orthoMatrix(0, this.element.width, this.element.height, 0, -9999, 9999);
            this.gl.uniformMatrix4fv(p.mvpMatrix, false, new Float32Array(matrix));

            // Set up the texture
            for (let t of this.batchTextures.values()) {
                gl.activeTexture(gl.TEXTURE0 + t.index);
                gl.bindTexture(gl.TEXTURE_2D, this.getTexture(t));
                gl.uniform1i(p.textures[t.index], t.index);
            }

            // Draw
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            // TODO: Use bufferSubData
            // gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices.buffer);
            gl.vertexAttribPointer(p.position, 2, gl.FLOAT, false, 52, 0);
            gl.vertexAttribPointer(p.texCoord, 2, gl.FLOAT, false, 52, 8);
            gl.vertexAttribPointer(p.tintColor, 4, gl.FLOAT, false, 52, 16);
            gl.vertexAttribPointer(p.viewport, 4, gl.FLOAT, false, 52, 32);
            gl.vertexAttribPointer(p.texId, 1, gl.FLOAT, false, 52, 48);
            gl.enableVertexAttribArray(p.position);
            gl.enableVertexAttribArray(p.texCoord);
            gl.enableVertexAttribArray(p.tintColor);
            gl.enableVertexAttribArray(p.viewport);
            gl.enableVertexAttribArray(p.texId);
            gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
            // gl.disableVertexAttribArray(p.position);
            // gl.disableVertexAttribArray(p.texCoord);
            // gl.disableVertexAttribArray(p.tintColor);
            // gl.disableVertexAttribArray(p.viewport);
            // gl.disableVertexAttribArray(p.texId);
            // gl.bindBuffer(gl.ARRAY_BUFFER, null);
        });
        this.vertices = new VertexBuffer();
        this.batchTextures = new Map();
        this.batchTextureCount = 0;
    }

    private getTexture(textureBitmap: TextureBitmap): WebGLTexture {
        const gl = this.gl;
        let texture = this.textures.get(textureBitmap.id);
        if (!texture) {
            const t = gl.createTexture();
            if (!t) throw new Error("Failed to create texture");
            texture = t;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureBitmap.bitmap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.textures.set(textureBitmap.id, texture);
        }
        return texture;
    }
}

// function aabbIntersects(a: number[], b: number[]) {
//     return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
// }

export class TextRasterizer {
    private readonly cache: Map<string, { width: number, bitmap: TextureBitmap | undefined }> = new Map();
    private readonly context = document.createElement("canvas").getContext("2d")!;
    private readonly invalidate: () => void;

    constructor(invalidate: () => void) {
        this.invalidate = invalidate;
    }

    static font(size: number, fontNum: number) {
        size -= 2;
        switch (fontNum) {
            case 1: return `${size}px Liberation Sans`;
            case 2: return `${size}px Liberation Sans`; // TODO: bold
            case 0:
            default:
                return `${size}px Bitstream Vera Mono`;
        }
    }

    measureText(size: number, font: number, text: string) {
        this.context.font = TextRasterizer.font(size, font);
        return this.context.measureText(text.replaceAll(reColor, "")).width;
    }

    get(size: number, font: number, text: string) {
        const key = `${size}:${font}:${text}`;
        let bitmap = this.cache.get(key);
        if (!bitmap) {
            bitmap = {
                width: 0,
                bitmap: undefined as (TextureBitmap | undefined),
            };
            this.cache.set(key, bitmap);

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Failed to get 2D context");
            context.font = TextRasterizer.font(size, font);
            const metrics = context.measureText(text);
            if (metrics.width > 0) {
                bitmap.width = metrics.width;
                canvas.width = metrics.width;
                canvas.height = size;
                context.font = TextRasterizer.font(size, font);
                context.fillStyle = 'white';
                context.textBaseline = "bottom";
                context.fillText(text, 0, size);
                createImageBitmap(canvas).then((b) => {
                    bitmap!.bitmap = { id: key, bitmap: b };
                    this.invalidate();
                });
            }
        }
        return bitmap;
    }
}

const reColor = /\^([0-9])|\^[xX]([0-9a-fA-F]{6})/g
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
    private root: HTMLElement;
    private _width: number;
    private _height: number;
    private canvas: Canvas;
    private currentColor: number[] = [0, 0, 0, 0];
    private readonly imageRepo: ImageRepository;
    private readonly textRasterizer;
    private white: { bitmap: ImageData; id: string };

    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }

    constructor(root: HTMLElement, imageRepo: ImageRepository, invalidate: () => void) {
        this.root = root;

        root.style.position = "relative";

        const r = root.getBoundingClientRect();
        this._width = r.width;
        this._height = r.height;

        this.imageRepo = imageRepo;

        this.white = { id: "white", bitmap: this.createWhiteTexture() };

        this.canvas = new Canvas(this._width, this._height);
        this.root.appendChild(this.canvas.element);

        this.textRasterizer = new TextRasterizer(invalidate);
    }

    destroy() {
        this.root.removeChild(this.canvas.element);
    }

    onFrame() {
        const r = this.root.getBoundingClientRect();
        if (r.width !== this._width || r.height !== this._height) {
            this._width = r.width;
            this._height = r.height;
            this.canvas.resize(this._width, this._height);
            return true;
        }
        return false;
    }

    measureText(size: number, font: number, text: string) {
        return this.textRasterizer.measureText(size, font, text);
    }

    render(view: DataView) {
        const layers = DrawCommandInterpreter.sort(view);
        layers.forEach((layer) => {
            this.setColor(1, 1, 1, 1);
            this.canvas.begin();
            layer.commands.forEach((buffer) => {
                DrawCommandInterpreter.run(buffer, {
                    onSetViewport: (x: number, y: number, width: number, height: number) => {
                        if (width === 0 || height === 0) {
                            this.setViewport(0, 0, this._width, this._height);
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
                    onDrawImage: (handle: number, x: number, y: number, width: number, height: number, s1: number, t1: number, s2: number, t2: number) => {
                        this.drawImage(handle, x, y, width, height, s1, t1, s2, t2);
                    },
                    onDrawImageQuad: (handle: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, s1: number, t1: number, s2: number, t2: number, s3: number, t3: number, s4: number, t4: number) => {
                        this.drawImageQuad(handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4);
                    },
                    onDrawString: (x: number, y: number, align: number, height: number, font: number, text: string) => {
                        this.drawString(x, y, align, height, font, text);
                    },
                });
            });
            this.canvas.end();
        });

    }

    private setViewport(x: number, y: number, width: number, height: number) {
        this.canvas.setViewport(x, y, width, height);
    }

    private setColor(r: number, g: number, b: number, a: number) {
        this.currentColor = [r / 255, g / 255, b / 255, a / 255];
    }

    private setColorEscape(text: string) {
        const a = text.match(/^\^[0-9]/);
        if (a) {
            this.currentColor = colorEscape[parseInt(a[0][1])];
            return text.substring(2);
        } else {
            const color = text.match(/^\^[xX][0-9a-fA-F]{6}/);
            if (color) {
                const r = parseInt(color[0].substring(2, 4), 16);
                const g = parseInt(color[0].substring(4, 6), 16);
                const b = parseInt(color[0].substring(6, 8), 16);
                this.currentColor = [r / 255, g / 255, b / 255, 1];
                return text.substring(8);
            }
        }
        return text;
    }

    private drawImage(handle: number, x: number, y: number, width: number, height: number, s1: number, t1: number, s2: number, t2: number) {
        this.drawImageQuad(handle, x, y, x + width, y, x + width, y + height, x, y + height, s1, t1, s2, t1, s2, t2, s1, t2);
    }

    private drawImageQuad(handle: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, s1: number, t1: number, s2: number, t2: number, s3: number, t3: number, s4: number, t4: number) {
        if (handle === 0) {
            this.canvas.drawQuad([x1, y1, x2, y2, x3, y3, x4, y4], [0, 0, 1, 0, 1, 1, 0, 1], this.white, this.currentColor);
        } else {
            const image = this.imageRepo.get(handle);
            if (image && image.bitmap) {
                this.canvas.drawQuad([x1, y1, x2, y2, x3, y3, x4, y4], [s1, t1, s2, t2, s3, t3, s4, t4], { id: handle.toString(), bitmap: image.bitmap }, this.currentColor);
            }
        }
    }

    private drawString(x: number, y: number, align: number, height: number, font: number, text: string) {
        let pos = { x, y };
        text.split("\n").forEach((line) => {
            this.drawStringLine(pos, align, height, font, line);
        });
    }

    private drawStringLine(pos: { x: number, y: number }, align: number, height: number, font: number, text: string) {
        const segments = [];

        let m;
        while (m = reColor.exec(text)) {
            segments.push({ text: text.substring(0, m.index), color: this.currentColor, bitmap: this.textRasterizer.get(height, font, text.substring(0, m.index)) });
            text = text.substring(m.index + m[0].length);

            if (m[1]) {
                this.currentColor = colorEscape[parseInt(m[1])];
            } else {
                const r = parseInt(m[2].substring(0, 2), 16);
                const g = parseInt(m[2].substring(2, 4), 16);
                const b = parseInt(m[2].substring(4, 6), 16);
                this.currentColor = [r / 255, g / 255, b / 255, 1];
            }
        }
        if (text.length > 0) {
            segments.push({ text, color: this.currentColor, bitmap: this.textRasterizer.get(height, font, text) });
        }

        const width = segments.reduce((width, segment) => width + segment.bitmap.width, 0);

        let x = pos.x;
        switch (align) {
            case 1: // CENTER
                x = Math.floor((this._width - width) / 2 + pos.x);
                break;
            case 2: // RIGHT
                x = Math.floor(this._width - width - pos.x);
                break;
            case 3: // CENTER_X
                x = Math.floor(pos.x - width / 2);
                break;
            case 4: // RIGHT_X
                x = Math.floor(pos.x - width);
                break;
        }

        segments.forEach((segment) => {
            if (segment.bitmap.bitmap) {
                this.canvas.drawQuad(
                    [x, pos.y, x + segment.bitmap.width, pos.y, x + segment.bitmap.width, pos.y + height, x, pos.y + height],
                    [0, 0, 1, 0, 1, 1, 0, 1],
                    segment.bitmap.bitmap, segment.color);
            }
            x += segment.bitmap.width;
        });

        pos.y += height;
    }

    private createWhiteTexture() {
        const data = new ImageData(1, 1);
        data.data.set([255, 255, 255, 255]);
        return data;
    }
}
