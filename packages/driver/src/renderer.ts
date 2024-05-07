
const vertexShaderSource = `
attribute vec2 a_Position;
uniform vec2 u_Resolution;
void main(void) {
  vec2 zeroToOne = a_Position / u_Resolution;
  vec2 zeroToTwo = zeroToOne * 2.0 - 1.0;
  vec2 clipSpace = zeroToTwo * vec2(1, -1);
  gl_Position = vec4(clipSpace, 0, 1);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec4 u_Color;
void main(void) {
    gl_FragColor = u_Color;
}
`;

class Canvas {
    private readonly gl: WebGLRenderingContext;
    private readonly program: WebGLProgram;
    private readonly positionAttributeLocation: GLint;
    private readonly colorUniformLocation: WebGLUniformLocation;
    private readonly vertexBuffer: WebGLBuffer;

    get element(): HTMLCanvasElement {
        return this._element;
    }
    private readonly _element: HTMLCanvasElement;

    constructor(width: number, height: number) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        // canvas.style.position = 'absolute';
        this._element = canvas;

        const gl = canvas.getContext("webgl");
        if (!gl) throw new Error("Failed to get WebGL context");
        this.gl = gl;

        this.program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);

        this.positionAttributeLocation = gl.getAttribLocation(this.program, "a_Position");
        if (this.positionAttributeLocation < 0) throw new Error("Failed to get attribute location");
        gl.enableVertexAttribArray(this.positionAttributeLocation);

        const resolutionUniformLocation = gl.getUniformLocation(this.program, "u_Resolution");
        if (!resolutionUniformLocation) throw new Error("Failed to get uniform location");
        gl.useProgram(this.program)
        gl.uniform2f(resolutionUniformLocation, width, height)

        const colorUniformLocation = gl.getUniformLocation(this.program, "u_Color");
        if (!colorUniformLocation) throw new Error("Failed to get uniform location");
        this.colorUniformLocation = colorUniformLocation;

        const vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) throw new Error("Failed to create vertex buffer");
        this.vertexBuffer = vertexBuffer;

        gl.viewport(0, 0, width, height);
    }

    fillRect(coords: number[], color: number[]) {
        const gl = this.gl;
        gl.useProgram(this.program);

        // Create a buffer to store the rectangle's vertices
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);

        // Assign the buffer to the attribute
        gl.vertexAttribPointer(this.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        // Assign the color
        gl.uniform4fv(this.colorUniformLocation, color);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    private createShaderProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
        const gl = this.gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) throw new Error("Failed to create vertex shader");
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) throw new Error("Failed to create fragment shader");
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        const shaderProgram = gl.createProgram();
        if (!shaderProgram) throw new Error("Failed to create shader program");
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        return shaderProgram;
    }
}

export class Renderer {
    private root: HTMLDivElement;
    private canvas: Canvas;
    private currentColor: number[] = [0, 0, 0, 0];

    constructor(root: HTMLDivElement) {
        this.root = root;
        this.canvas = new Canvas(1920, 1080);
        this.root.appendChild(this.canvas.element);
    }

    begin() {
        // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.currentColor = [r / 255, g / 255, b / 255, a / 255];
    }

    drawImage(handle: number, x: number, y: number, width: number, height: number) {
        if (handle === 0) {
            this.canvas.fillRect([x, y, x + width, y, x + width, y + height, x, y + height], this.currentColor);
        }
    }
}
