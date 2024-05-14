import type { TextureBitmap } from "./renderer.ts";

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

const textureFragmentShaderSource = (max: number) => {
	let switchCode = "";
	for (let i = 0; i < max; ++i) {
		if (i === 0) {
			switchCode += `if (v_TexId < ${i}.5) `;
		} else if (i === max - 1) {
			switchCode += "else ";
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
};

class ShaderProgram<T> {
	private readonly gl: WebGLRenderingContext;
	private readonly program: WebGLProgram;
	private readonly locations: T;

	constructor(
		gl: WebGLRenderingContext,
		vertexShaderSource: string,
		fragmentShaderSource: string,
		bindLocations: (_: WebGLProgram) => T,
	) {
		this.gl = gl;

		const vertexShader = this.createShader(
			gl.VERTEX_SHADER,
			vertexShaderSource,
		);
		const fragmentShader = this.createShader(
			gl.FRAGMENT_SHADER,
			fragmentShaderSource,
		);

		const program = gl.createProgram();
		if (!program) throw new Error("Failed to create program");
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(
				`Failed to link program: ${gl.getProgramInfoLog(program)}`,
			);
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
			throw new Error(
				`Failed to compile shader: ${gl.getShaderInfoLog(shader)}`,
			);
		}

		return shader;
	}
}

function orthoMatrix(
	left: number,
	right: number,
	bottom: number,
	top: number,
	near: number,
	far: number,
) {
	return [
		2 / (right - left),
		0,
		0,
		0,
		0,
		2 / (top - bottom),
		0,
		0,
		0,
		0,
		-2 / (far - near),
		0,
		-((right + left) / (right - left)),
		-((top + bottom) / (top - bottom)),
		-((far + near) / (far - near)),
		1,
	];
}

class VertexBuffer {
	private _buffer: Float32Array;
	private offset: number;

	constructor() {
		// TODO: Use a dynamic buffer
		this._buffer = new Float32Array(512 * 1024);
		this.offset = 0;
	}

	get buffer() {
		return this._buffer.slice(0, this.offset);
	}

	get length() {
		return this.offset / 13;
	}

	push(
		i: number,
		coords: number[],
		texCoords: number[],
		tintColor: number[],
		viewport: number[],
		textureSlot: number,
	) {
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

export class Canvas {
	private readonly gl: WebGLRenderingContext;

	private readonly textureProgram: ShaderProgram<{
		position: number;
		texCoord: number;
		tintColor: number;
		viewport: number;
		texId: number;
		mvpMatrix: WebGLUniformLocation;
		textures: WebGLUniformLocation[];
	}>;

	private readonly textures: Map<string, WebGLTexture> = new Map();
	private viewport: number[] = [];
	private vertices: VertexBuffer = new VertexBuffer();
	private drawCount = 0;
	private readonly vbo: WebGLBuffer;
	private readonly maxTextures: number;
	private batchTextures: Map<string, TextureBitmap & { index: number }> =
		new Map();
	private batchTextureCount = 0;
	private dispatchCount = 0;

	get element(): OffscreenCanvas {
		return this._element;
	}
	private readonly _element: OffscreenCanvas;

	constructor(canvas: OffscreenCanvas) {
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

		this.textureProgram = new ShaderProgram(
			gl,
			vertexShaderSource,
			textureFragmentShaderSource(this.maxTextures),
			(program) => {
				const position = gl.getAttribLocation(program, "a_Position");
				if (position < 0) throw new Error("Failed to get attribute location");

				const texCoord = gl.getAttribLocation(program, "a_TexCoord");
				if (texCoord < 0) throw new Error("Failed to get attribute location");

				const tintColor = gl.getAttribLocation(program, "a_TintColor");
				if (tintColor < 0)
					throw new Error("Failed to get attribute location: tintColor");

				const viewport = gl.getAttribLocation(program, "a_Viewport");
				if (viewport < 0)
					throw new Error("Failed to get attribute location: viewport");

				const texId = gl.getAttribLocation(program, "a_TexId");
				if (texId < 0)
					throw new Error("Failed to get attribute location: texId");

				const mvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
				if (!mvpMatrix)
					throw new Error("Failed to get uniform location: mvpMatrix");

				const textures = [];
				for (let i = 0; i < this.maxTextures; ++i) {
					const texture = gl.getUniformLocation(program, `u_Texture[${i}]`);
					if (!texture)
						throw new Error("Failed to get uniform location: texture");
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
			},
		);

		const vbo = gl.createBuffer();
		if (!vbo) throw new Error("Failed to create vertex buffer");
		this.vbo = vbo;

		// Set up the viewport
		this.setViewport(0, 0, canvas.width, canvas.height);
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

	drawQuad(
		coords: number[],
		texCoords: number[],
		textureBitmap: TextureBitmap,
		tintColor: number[],
	) {
		this.drawCount++;

		let t = this.batchTextures.get(textureBitmap.id);
		if (!t) {
			if (this.batchTextures.size >= this.maxTextures) {
				this.dispatch();
			}
			t = { ...textureBitmap, index: this.batchTextureCount++ };
			this.batchTextures.set(textureBitmap.id, t);
		}

		for (const i of [0, 1, 2, 0, 2, 3]) {
			this.vertices.push(
				i,
				coords,
				texCoords,
				tintColor,
				this.viewport,
				t.index,
			);
		}
	}

	private dispatch() {
		if (this.vertices.length === 0) return;

		this.dispatchCount++;

		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertices.buffer, gl.STREAM_DRAW);
		this.textureProgram.use((p) => {
			// Set up the viewport
			this.gl.viewport(0, 0, this.element.width, this.element.height);
			const matrix = orthoMatrix(
				0,
				this.element.width,
				this.element.height,
				0,
				-9999,
				9999,
			);
			this.gl.uniformMatrix4fv(p.mvpMatrix, false, new Float32Array(matrix));

			// Set up the texture
			for (const t of this.batchTextures.values()) {
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
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				textureBitmap.bitmap,
			);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			this.textures.set(textureBitmap.id, texture);
		}
		return texture;
	}
}
