import { TextureFlags } from "../image.ts";
import { log, tag } from "../logger.ts";
import type { TextureBitmap } from "./renderer.ts";

const vertexShaderSource = `#version 300 es
uniform mat4 u_MvpMatrix;

in vec2 a_Position;
in vec2 a_TexCoord;
in vec4 a_TintColor;
in vec4 a_Viewport;
in float a_TexId;

out vec2 v_ScreenPos;
out vec2 v_TexCoord;
out vec4 v_TintColor;
out vec4 v_Viewport;
out float v_TexId;

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
}`;

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
    switchCode += `color = texture(u_Texture[${i}], v_TexCoord);\n`;
  }
  return `#version 300 es
precision mediump float;

uniform sampler2D u_Texture[${max}];

in vec2 v_ScreenPos;
in vec2 v_TexCoord;
in vec4 v_TintColor;
in vec4 v_Viewport;
in float v_TexId;

out vec4 fragColor;

void main(void) {
    float x = v_ScreenPos[0], y = v_ScreenPos[1];
    if (x < v_Viewport[0] || x >= v_Viewport[2] || y < v_Viewport[1] || y >= v_Viewport[3]) {
      discard;
    }
    vec4 color;
    ${switchCode}
    fragColor = color * v_TintColor;
}
`;
};

class ShaderProgram<T> {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly locations: T;

  constructor(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
    bindLocations: (_: WebGLProgram) => T,
  ) {
    this.gl = gl;

    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Failed to link program: ${gl.getProgramInfoLog(program)}`);
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
      throw new Error(`Failed to compile shader: ${gl.getShaderInfoLog(shader)}`);
    }

    return shader;
  }
}

function orthoMatrix(left: number, right: number, bottom: number, top: number, near: number, far: number) {
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

export class WebGL1Backend {
  private readonly gl: WebGL2RenderingContext;
  private readonly extTextureBptc: EXT_texture_compression_bptc | null;
  private readonly extTextureS3tc: WEBGL_compressed_texture_s3tc | null;

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
  private pixelRatio = 1;
  private vertices: VertexBuffer = new VertexBuffer();
  private drawCount = 0;
  private readonly vbo: WebGLBuffer;
  private readonly maxTextures: number;
  private batchTextures: Map<string, { index: number; texture: WebGLTexture }> = new Map();
  private batchTextureCount = 0;
  private dispatchCount = 0;

  get canvas(): OffscreenCanvas {
    return this._canvas;
  }
  private readonly _canvas: OffscreenCanvas;

  constructor(canvas: OffscreenCanvas) {
    this._canvas = canvas;

    const gl = canvas.getContext("webgl2", { antialias: false, depth: false, premultipliedAlpha: true });
    if (!gl) throw new Error("Failed to get WebGL context");
    this.gl = gl;

    // https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_compression_bptc
    this.extTextureBptc = gl.getExtension("EXT_texture_compression_bptc");
    this.extTextureS3tc = gl.getExtension("WEBGL_compressed_texture_s3tc");
    log.info(tag.backend, "EXT_texture_compression_bptc", this.extTextureBptc);
    log.info(tag.backend, "WEBGL_compressed_texture_s3tc", this.extTextureS3tc);

    gl.clearColor(0, 0, 0, 1);
    // gl.enable(gl.TEXTURE_2D);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;

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
        if (tintColor < 0) throw new Error("Failed to get attribute location: tintColor");

        const viewport = gl.getAttribLocation(program, "a_Viewport");
        if (viewport < 0) throw new Error("Failed to get attribute location: viewport");

        const texId = gl.getAttribLocation(program, "a_TexId");
        if (texId < 0) throw new Error("Failed to get attribute location: texId");

        const mvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
        if (!mvpMatrix) throw new Error("Failed to get uniform location: mvpMatrix");

        const textures = [];
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
      },
    );

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error("Failed to create vertex buffer");
    this.vbo = vbo;

    // Set up the viewport
    this.setViewport(0, 0, canvas.width, canvas.height);
  }

  resize(width: number, height: number, pixelRatio: number) {
    this._canvas.width = width;
    this._canvas.height = height;
    this.pixelRatio = pixelRatio;
    this.setViewport(0, 0, width, height);
    log.debug(tag.backend, `resize: ${width}x${height}(x${pixelRatio})`);
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this.viewport = [x, y, width, height];
  }

  begin() {
    this.resetBatch();
  }

  end() {
    // if (this.textures.get("@text:1")) {
    //   this.drawQuad(
    //     [0, 0, 1024, 0, 1024, 1024, 0, 1024],
    //     [0, 0, 1, 0, 1, 1, 0, 1],
    //     { id: "@text:1", bitmap: new ImageData(1024, 1024), flags: 0 },
    //     [1, 1, 1, 1],
    //   );
    // }
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
      const texture = this.getTexture(textureBitmap);
      t = { index: this.batchTextureCount++, texture };
      this.batchTextures.set(textureBitmap.id, t);
    }
    if (textureBitmap.updateSubImage) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, t.texture);
      const sub = textureBitmap.updateSubImage();
      gl.texSubImage2D(gl.TEXTURE_2D, 0, sub.x, sub.y, sub.width, sub.height, gl.RGBA, gl.UNSIGNED_BYTE, sub.source);
    }

    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.vertices.push(i, coords, texCoords, tintColor, this.viewport, t.index);
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
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      const matrix = orthoMatrix(0, this.canvas.width, this.canvas.height, 0, -9999, 9999);
      this.gl.uniformMatrix4fv(p.mvpMatrix, false, new Float32Array(matrix));

      // Set up the texture
      for (const t of this.batchTextures.values()) {
        gl.activeTexture(gl.TEXTURE0 + t.index);
        gl.bindTexture(gl.TEXTURE_2D, t.texture);
        gl.uniform1i(p.textures[t.index], t.index);
      }

      // Draw

      // https://github.com/PathOfBuildingCommunity/PathOfBuilding-SimpleGraphic/blob/v2.0.2/engine/render/r_main.cpp#L430-L434
      // NOTE: SimpleGraphic's default should be PB_ALPHA, but it doesn't draw correctly unless RB_PRE_ALPHA
      // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // RB_ALPHA
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // RB_PRE_ALPHA
      // gl.blendFunc(gl.ONE, gl.ONE); // RB_ADDITIVE

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
    this.resetBatch();
  }

  private resetBatch() {
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
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

      if (textureBitmap.bitmap.flags & TextureFlags.TF_NOMIPMAP) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        // gl.generateMipmap(gl.TEXTURE_2D);
      }
      if (textureBitmap.bitmap.flags & TextureFlags.TF_NEAREST) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }

      // TODO: If commented out, the tree renders wrong
      // if (textureBitmap.flags & TextureFlags.TF_CLAMP) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // } else {
      //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      // }

      if (textureBitmap.bitmap.bitmap) {
        if (textureBitmap.bitmap.type === "ImageLike") {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureBitmap.bitmap.bitmap);
        } else if (textureBitmap.bitmap.type === "DDSImage") {
          const image = textureBitmap.bitmap.bitmap;
          switch (image.dxgiFormat) {
            case 28: // DXGI_FORMAT_R8G8B8A8_UNORM
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                image.width,
                image.height,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image.data,
              );
              break;
            case 71: // DXGI_FORMAT_BC1_UNORM
              if (this.extTextureS3tc) {
                log.debug(tag.backend, "Loading DXGI_FORMAT_BC1_UNORM", image.width, image.height);
                gl.compressedTexImage2D(
                  gl.TEXTURE_2D,
                  0,
                  this.extTextureS3tc.COMPRESSED_RGBA_S3TC_DXT1_EXT,
                  image.width,
                  image.height,
                  0,
                  image.data,
                );
              }
              break;
            case 98: // DXGI_FORMAT_BC7_UNORM
              if (this.extTextureBptc) {
                log.debug(tag.backend, "Loading DXGI_FORMAT_BC7_UNORM", image.width, image.height);
                gl.compressedTexImage2D(
                  gl.TEXTURE_2D,
                  0,
                  this.extTextureBptc.COMPRESSED_RGBA_BPTC_UNORM_EXT,
                  image.width,
                  image.height,
                  0,
                  image.data,
                );
              }
              break;
            default:
              log.error(tag.backend, "Unknown DXGI format", image.dxgiFormat);
              break;
          }
        } else {
          const _: never = textureBitmap.bitmap;
        }
        if ((textureBitmap.bitmap.flags & TextureFlags.TF_NOMIPMAP) === 0) {
          // gl.generateMipmap(gl.TEXTURE_2D);
        }
      }

      this.textures.set(textureBitmap.id, texture);
      // console.log("Created texture", textureBitmap.id, textureBitmap.bitmap.width, textureBitmap.bitmap.height);
    }
    return texture;
  }
}
