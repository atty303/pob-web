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

varying vec2 v_ScreenPos;
varying vec2 v_TexCoord;
varying vec4 v_TintColor;
varying vec4 v_Viewport;

void main(void) {
    v_TexCoord = a_TexCoord;
    v_TintColor = a_TintColor;

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


const fillFragmentShaderSource = `
precision mediump float;
uniform vec4 u_Color;
varying vec4 v_Viewport;

void main(void) {
    gl_FragColor = u_Color;
}
`;

const textureFragmentShaderSource = `
precision mediump float;

uniform sampler2D u_Texture;

varying vec2 v_ScreenPos;
varying vec2 v_TexCoord;
varying vec4 v_Viewport;
varying vec4 v_TintColor;

void main(void) {
    float x = v_ScreenPos[0], y = v_ScreenPos[1];
    if (x < v_Viewport[0] || x >= v_Viewport[2] || y < v_Viewport[1] || y >= v_Viewport[3]) {
      discard;
    }
    gl_FragColor = texture2D(u_Texture, v_TexCoord) * v_TintColor;
}
`;

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

class Canvas {
    private readonly gl: WebGLRenderingContext;

    private readonly fillProgram: ShaderProgram<{ position: number, resolution: WebGLUniformLocation, color: WebGLUniformLocation }>;
    private readonly textureProgram: ShaderProgram<{ position: number, texCoord: number, resolution: WebGLUniformLocation, texture: WebGLUniformLocation }>;

    private readonly positionBuffer: WebGLBuffer;
    private readonly texCoordBuffer: WebGLBuffer;
    private readonly tintColorBuffer: WebGLBuffer;
    private readonly viewportBuffer: WebGLBuffer;

    private readonly textures: Map<string, WebGLTexture>  = new Map();
    private viewport: number[] = [];

    get element(): HTMLCanvasElement {
        return this._element;
    }
    private readonly _element: HTMLCanvasElement;

    constructor(width: number, height: number) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        this._element = canvas;

        const gl = canvas.getContext("webgl");
        if (!gl) throw new Error("Failed to get WebGL context");
        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.fillProgram = new ShaderProgram(gl, vertexShaderSource, fillFragmentShaderSource, (program) => {
            const position = gl.getAttribLocation(program, "a_Position");
            if (position < 0) throw new Error("Failed to get attribute location");

            const color = gl.getUniformLocation(program, "u_Color");
            if (!color) throw new Error("Failed to get uniform location: color");

            return {
                position,
                color,
            };
        });

        this.textureProgram = new ShaderProgram(gl, vertexShaderSource, textureFragmentShaderSource, (program) => {
            const position = gl.getAttribLocation(program, "a_Position");
            if (position < 0) throw new Error("Failed to get attribute location");

            const texCoord = gl.getAttribLocation(program, "a_TexCoord");
            if (texCoord < 0) throw new Error("Failed to get attribute location");

            const tintColor = gl.getAttribLocation(program, "a_TintColor");
            if (tintColor < 0) throw new Error("Failed to get attribute location: tintColor");

            const viewport = gl.getAttribLocation(program, "a_Viewport");
            if (viewport < 0) throw new Error("Failed to get attribute location: viewport");

            const mvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
            if (!mvpMatrix) throw new Error("Failed to get uniform location: mvpMatrix");

            const texture = gl.getUniformLocation(program, "u_Texture");
            if (!texture) throw new Error("Failed to get uniform location");

            return {
                position,
                texCoord,
                tintColor,
                viewport,
                mvpMatrix,
                texture,
            };
        });

        const positionBuffer = gl.createBuffer();
        if (!positionBuffer) throw new Error("Failed to create vertex buffer");
        this.positionBuffer = positionBuffer;

        const texCoordBuffer = gl.createBuffer();
        if (!texCoordBuffer) throw new Error("Failed to create texture coordinate buffer");
        this.texCoordBuffer = texCoordBuffer;

        const tintColorBuffer = gl.createBuffer();
        if (!tintColorBuffer) throw new Error("Failed to create tint color buffer");
        this.tintColorBuffer = tintColorBuffer;

        const viewportBuffer = gl.createBuffer();
        if (!viewportBuffer) throw new Error("Failed to create viewport buffer");
        this.viewportBuffer = viewportBuffer;

        // Set up the viewport
        this.setViewport(0, 0, width, height);
    }

    setViewport(x: number, y: number, width: number, height: number) {
        this.viewport = [x, y, width, height];
        this.gl.viewport(0, 0, width, height);
    }

    fillRect(coords: number[], color0: number[]) {
        const gl = this.gl;
        this.fillProgram.use(({ position, color }) => {
            gl.enableVertexAttribArray(position);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            gl.uniform4fv(color, color0);

            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

            gl.disableVertexAttribArray(position);
        });
    }

    drawImage(coords: number[], texCoords: number[], textureBitmap: TextureBitmap, tintColor0: number[]) {
        const gl = this.gl;
        this.textureProgram.use(({ position, texCoord, tintColor, viewport, mvpMatrix, texture }) => {
            const matrix = orthoMatrix(0, this.viewport[2], this.viewport[3], 0, -9999, 9999);
            this.gl.uniformMatrix4fv(mvpMatrix, false, new Float32Array(matrix));

            const tex = this.getTexture(textureBitmap);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(texture, 0);

            gl.enableVertexAttribArray(position);
            gl.enableVertexAttribArray(texCoord);
            gl.enableVertexAttribArray(tintColor);
            gl.enableVertexAttribArray(viewport);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
            gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.tintColorBuffer);
            const tp = [...tintColor0, ...tintColor0, ...tintColor0, ...tintColor0];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tp), gl.STATIC_DRAW);
            gl.vertexAttribPointer(tintColor, 4, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportBuffer);
            const vp = [...this.viewport, ...this.viewport, ...this.viewport, ...this.viewport];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vp), gl.STATIC_DRAW);
            gl.vertexAttribPointer(viewport, 4, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

            gl.disableVertexAttribArray(position);
            gl.disableVertexAttribArray(texCoord);
            gl.disableVertexAttribArray(tintColor);
            gl.disableVertexAttribArray(viewport);
        });
    }

    private getTexture(textureBitmap: TextureBitmap): WebGLTexture {
        const gl = this.gl;
        let texture = this.textures.get(textureBitmap.id);
        if (!texture) {
            const t = gl.createTexture();
            if (!t) throw new Error("Failed to create texture");
            texture = t;
            (t as any).premultiplyAlpha = true;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureBitmap.bitmap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.textures.set(textureBitmap.id, texture);
        }
        return texture;
    }
}

export class TextRasterizer {
    private readonly cache: Map<string, ImageBitmap> = new Map();
    private readonly cacheKeys: Set<string> = new Set();

    static font(size: number, fontNum: number) {
        switch (fontNum) {
            case 1: return `${size}px Liberation Sans`;
            case 2: return `${size}px Liberation Sans`;
            case 0:
            default:
                return `${size}px Bitstream Vera Mono`;
        }
    }

    get(height: number, font: number, text: string, color: number[]) {
        const key = `${height}:${font}:${text}`;
        let bitmap = this.cache.get(key);
        if (!bitmap && !this.cacheKeys.has(key)) {
            this.cacheKeys.add(key);
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Failed to get 2D context");
            context.font = TextRasterizer.font(height, font);
            // context.fillStyle = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3] * 255})`;
            context.fillStyle = 'white';
            const metrics = context.measureText(text);
            if (metrics.width > 0) {
                canvas.width = metrics.width;
                canvas.height = height;
                // context.textAlign = ["left", "center", "right"][align];
                context.textBaseline = "top";
                // context.textBaseline = "middle";
                context.fillText(text, 0, 0);
                createImageBitmap(canvas).then((bitmap) => {
                    this.cache.set(key, bitmap);
                    // TODO: invalidate();
                });
            }
        }
        return bitmap;
    }
}

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
    private root: HTMLDivElement;
    private canvas: Canvas;
    private currentColor: number[] = [0, 0, 0, 0];
    private readonly imageRepo: ImageRepository;
    private readonly textRasterizer = new TextRasterizer();
    private width: number;
    private height: number;
    private white: { bitmap: ImageData; id: string };

    constructor(root: HTMLDivElement, imageRepo: ImageRepository) {
        this.root = root;
        this.imageRepo = imageRepo;
        this.width = 1920;
        this.height = 1080;

        this.white = { id: "white", bitmap: this.createWhiteTexture() };

        this.canvas = new Canvas(this.width, this.height);
        this.root.appendChild(this.canvas.element);
    }

    render(view: DataView) {
        const layers = DrawCommandInterpreter.sort(view);
        layers.forEach((layer) => {
            this.setColor(1, 1, 1, 1);
            layer.commands.forEach((buffer) => {
                DrawCommandInterpreter.run(buffer, {
                    onSetViewport: (x: number, y: number, width: number, height: number) => {
                        if (width === 0 || height === 0) {
                            this.setViewport(0, 0, this.width, this.height);
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
        });
    }

    setViewport(x: number, y: number, width: number, height: number) {
        this.canvas.setViewport(x, y, width, height);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.currentColor = [r / 255, g / 255, b / 255, a / 255];
    }

    setColorEscape(text: string) {
        const a = text.match(/\^[0-9]/);
        if (a) {
            this.currentColor = colorEscape[parseInt(a[0][1])];
        } else {
            const color = text.match(/^[xX][0-9a-fA-F]{6}/);
            if (color) {
                const r = parseInt(color[0].substr(2, 2), 16);
                const g = parseInt(color[0].substr(4, 2), 16);
                const b = parseInt(color[0].substr(6, 2), 16);
                this.currentColor = [r / 255, g / 255, b / 255, 1];
            }
        }
    }

    drawImage(handle: number, x: number, y: number, width: number, height: number, s1: number, t1: number, s2: number, t2: number) {
        this.drawImageQuad(handle, x, y, x + width, y, x + width, y + height, x, y + height, s1, t1, s2, t1, s2, t2, s1, t2);
    }

    drawImageQuad(handle: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, s1: number, t1: number, s2: number, t2: number, s3: number, t3: number, s4: number, t4: number) {
        if (handle === 0) {
            this.canvas.drawImage([x1, y1, x2, y2, x3, y3, x4, y4], [0, 0, 1, 0, 1, 1, 0, 1], this.white, this.currentColor);
        } else {
            const image = this.imageRepo.get(handle);
            if (image && image.bitmap) {
                this.canvas.drawImage([x1, y1, x2, y2, x3, y3, x4, y4], [s1, t1, s2, t2, s3, t3, s4, t4], { id: handle.toString(), bitmap: image.bitmap }, this.currentColor);
            }
        }
    }

    drawString(x: number, y: number, align: number, height: number, font: number, text: string) {
        const bitmap = this.textRasterizer.get(height, font, text, this.currentColor);
        if (bitmap) {
            switch (align) {
                case 3: // CENTER_X
                    x -= Math.floor(bitmap.width / 2);
                    break;
                case 4: // RIGHT_X
                    x -= bitmap.width;
                    break;
            }
            this.canvas.drawImage([x, y, x + bitmap.width, y, x + bitmap.width, y + bitmap.height, x, y + bitmap.height], [0, 0, 1, 0, 1, 1, 0, 1], { id: `${font}:${height}:${text}`, bitmap }, this.currentColor);
        }
    }

    private createWhiteTexture() {
        const data = new ImageData(1, 1);
        data.data.set([255, 255, 255, 255]);
        return data;
    }
}
