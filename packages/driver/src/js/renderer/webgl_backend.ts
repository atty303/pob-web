import { Format, Target } from "dds/src";
import { TextureFlags } from "../image";
import { log, tag } from "../logger";
import type { RenderBackend } from "./backend";
import type { TextureBitmap } from "./renderer";
import { type FormatDesc, glFormatFor } from "./webgl";

const vertexShaderSource = `#version 300 es
uniform mat4 u_MvpMatrix;

in vec2 a_Position;
in vec2 a_TexCoord;
in uint a_TintColor; // Packed RGBA as uint32
in vec4 a_Viewport;
in vec3 a_TexId;

out vec2 v_ScreenPos;
out vec2 v_TexCoord;
out vec4 v_TintColor;
out vec4 v_Viewport;
out vec3 v_TexId;

void main(void) {
    v_TexCoord = a_TexCoord;
    // Unpack color from uint32 to vec4
    v_TintColor = vec4(
        float((a_TintColor >> 24u) & 0xFFu) / 255.0,
        float((a_TintColor >> 16u) & 0xFFu) / 255.0,
        float((a_TintColor >> 8u) & 0xFFu) / 255.0,
        float(a_TintColor & 0xFFu) / 255.0
    );
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
      switchCode += `if (v_TexId.x < ${i}.5) `;
    } else if (i === max - 1) {
      switchCode += "else ";
    } else {
      switchCode += `else if (v_TexId.x < ${i}.5) `;
    }
    switchCode += `{
    color = texture(u_Texture[${i}], vec3(v_TexCoord, v_TexId.y));
    if (v_TexId.z > -0.5)
      color *= texture(u_Texture[${i}], vec3(v_TexCoord, v_TexId.z));
    }`;
  }
  return `#version 300 es
precision mediump float;

uniform highp sampler2DArray u_Texture[${max}];

in vec2 v_ScreenPos;
in vec2 v_TexCoord;
in vec4 v_TintColor;
in vec4 v_Viewport;
in vec3 v_TexId;

out vec4 f_fragColor;

void main(void) {
    float x = v_ScreenPos[0], y = v_ScreenPos[1];
    if (x < v_Viewport[0] || x >= v_Viewport[2] || y < v_Viewport[1] || y >= v_Viewport[3]) {
      discard;
    }
    vec4 color;
    ${switchCode}
    f_fragColor = color * v_TintColor;
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
  private _buffer: ArrayBuffer;
  private _floatView: Float32Array;
  private _uintView: Uint32Array;
  private _indices: Uint16Array;
  private vertexOffset: number;
  private indexOffset: number;
  private quadCount: number;
  private static readonly VERTEX_SIZE = 12; // 12 floats per vertex (reduced from 15)

  constructor() {
    this._buffer = new ArrayBuffer(1024 * 1024 * 4);
    this._floatView = new Float32Array(this._buffer);
    this._uintView = new Uint32Array(this._buffer);
    this._indices = new Uint16Array(1024 * 1024);
    this.vertexOffset = 0;
    this.indexOffset = 0;
    this.quadCount = 0;
  }

  get buffer() {
    return new Uint8Array(this._buffer, 0, this.vertexOffset * 4);
  }

  get indices() {
    return new Uint16Array(this._indices.buffer, 0, this.indexOffset);
  }

  get vertexCount() {
    return this.vertexOffset / VertexBuffer.VERTEX_SIZE;
  }

  get indexCount() {
    return this.indexOffset;
  }

  reset() {
    this.vertexOffset = 0;
    this.indexOffset = 0;
    this.quadCount = 0;
  }

  private ensureCapacity(requiredVertices: number, requiredIndices: number) {
    if (requiredVertices > this._floatView.length) {
      const newSize = Math.max(requiredVertices, this._floatView.length * 2);
      const newBuffer = new ArrayBuffer(newSize * 4);
      const newFloatView = new Float32Array(newBuffer);
      newFloatView.set(this._floatView);
      this._buffer = newBuffer;
      this._floatView = newFloatView;
      this._uintView = new Uint32Array(newBuffer);
    }
    if (requiredIndices > this._indices.length) {
      const newSize = Math.max(requiredIndices, this._indices.length * 2);
      const newIndices = new Uint16Array(newSize);
      newIndices.set(this._indices);
      this._indices = newIndices;
    }
  }

  pushQuad(
    coords: number[],
    texCoords: number[],
    tintColor: number[],
    viewport: number[],
    textureSlot: number,
    stackLayer: number,
    maskLayer: number,
  ) {
    this.ensureCapacity(this.vertexOffset + 48, this.indexOffset + 6); // 48 = 12 * 4 vertices

    const baseVertex = this.quadCount * 4;

    // Pack color into uint32
    const packedColor =
      (Math.round(tintColor[0] * 255) << 24) |
      (Math.round(tintColor[1] * 255) << 16) |
      (Math.round(tintColor[2] * 255) << 8) |
      Math.round(tintColor[3] * 255);

    // Push 4 vertices for the quad (12 values per vertex instead of 15)
    for (let i = 0; i < 4; i++) {
      const base = this.vertexOffset;
      this._floatView[base] = coords[i * 2];
      this._floatView[base + 1] = coords[i * 2 + 1];
      this._floatView[base + 2] = texCoords[i * 2];
      this._floatView[base + 3] = texCoords[i * 2 + 1];
      this._uintView[base + 4] = packedColor; // Store as uint32
      this._floatView[base + 5] = viewport[0];
      this._floatView[base + 6] = viewport[1];
      this._floatView[base + 7] = viewport[2];
      this._floatView[base + 8] = viewport[3];
      this._floatView[base + 9] = textureSlot;
      this._floatView[base + 10] = stackLayer;
      this._floatView[base + 11] = maskLayer;
      this.vertexOffset += VertexBuffer.VERTEX_SIZE;
    }

    // Push indices for two triangles (0,1,2) and (0,2,3)
    const idx = this._indices;
    idx[this.indexOffset++] = baseVertex + 0;
    idx[this.indexOffset++] = baseVertex + 1;
    idx[this.indexOffset++] = baseVertex + 2;
    idx[this.indexOffset++] = baseVertex + 0;
    idx[this.indexOffset++] = baseVertex + 2;
    idx[this.indexOffset++] = baseVertex + 3;

    this.quadCount++;
  }
}

export class WebGL1Backend implements RenderBackend {
  private readonly gl: WebGL2RenderingContext;
  private readonly ext: {
    textureBptc: EXT_texture_compression_bptc | null;
    textureS3tc: WEBGL_compressed_texture_s3tc | null;
    textureAnisotropic: EXT_texture_filter_anisotropic | null;
  };

  private readonly textureProgram: ShaderProgram<{
    position: number;
    texCoord: number;
    tintColor: number;
    viewport: number;
    texId: number;
    mvpMatrix: WebGLUniformLocation;
    textures: WebGLUniformLocation[];
  }>;

  private readonly textures: Map<string, { target: GLenum; format: FormatDesc; gl: WebGLTexture }> = new Map();
  private viewport: number[] = [];
  private pixelRatio = 1;
  private vertices: VertexBuffer = new VertexBuffer();
  private drawCount = 0;
  private readonly vbo: WebGLBuffer;
  private readonly ebo: WebGLBuffer;
  private vboSize = 0;
  private eboSize = 0;
  private readonly maxTextures: number;
  private batchTextures: Map<
    string,
    { index: number; texture: { target: GLenum; format: FormatDesc; gl: WebGLTexture } }
  > = new Map();
  private batchTextureCount = 0;
  private dispatchCount = 0;

  get canvas(): OffscreenCanvas {
    return this._canvas;
  }
  private readonly _canvas: OffscreenCanvas;

  constructor(canvas: OffscreenCanvas) {
    this._canvas = canvas;

    const gl = canvas.getContext("webgl2", { alpha: false });
    if (!gl) throw new Error("Failed to get WebGL context");
    this.gl = gl;

    // https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_compression_bptc
    this.ext = {
      textureBptc: gl.getExtension("EXT_texture_compression_bptc"),
      textureS3tc: gl.getExtension("WEBGL_compressed_texture_s3tc"),
      textureAnisotropic: gl.getExtension("EXT_texture_filter_anisotropic"),
    };

    log.info(tag.backend, "WebGL extensions", this.ext);

    gl.clearColor(0, 0, 0, 1);
    // gl.enable(gl.TEXTURE_2D);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;

    this.textureProgram = new ShaderProgram(
      gl,
      vertexShaderSource,
      textureFragmentShaderSource(this.maxTextures),
      program => {
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

    const ebo = gl.createBuffer();
    if (!ebo) throw new Error("Failed to create element buffer");
    this.ebo = ebo;

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

  beginFrame() {
    // WebGL doesn't need frame-level clearing management
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

  drawQuad(
    coords: number[],
    texCoords: number[],
    textureBitmap: TextureBitmap,
    tintColor: number[],
    stackLayer: number,
    maskLayer: number,
  ) {
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
      gl.bindTexture(t.texture.target, t.texture.gl);

      const sub = textureBitmap.updateSubImage();
      gl.texSubImage3D(
        t.texture.target,
        0,
        sub.x,
        sub.y,
        0,
        sub.width,
        sub.height,
        1,
        t.texture.format.external,
        t.texture.format.type,
        sub.source,
      );
    }

    this.vertices.pushQuad(coords, texCoords, tintColor, this.viewport, t.index, stackLayer, maskLayer);
  }

  private dispatch() {
    if (this.vertices.indexCount === 0) return;

    this.dispatchCount++;

    const gl = this.gl;

    // Update vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const bufferData = this.vertices.buffer;
    const requiredSize = bufferData.byteLength;

    if (requiredSize > this.vboSize) {
      gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STREAM_DRAW);
      this.vboSize = requiredSize;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, bufferData);
    }

    // Update index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    const indexData = this.vertices.indices;
    const indexSize = indexData.byteLength;

    if (indexSize > this.eboSize) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STREAM_DRAW);
      this.eboSize = indexSize;
    } else {
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, indexData);
    }
    this.textureProgram.use(p => {
      // Set up the viewport
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      const matrix = orthoMatrix(0, this.canvas.width, this.canvas.height, 0, -9999, 9999);
      this.gl.uniformMatrix4fv(p.mvpMatrix, false, new Float32Array(matrix));

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // RB_ALPHA
      // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // RB_PRE_ALPHA
      // gl.blendFunc(gl.ONE, gl.ONE); // RB_ADDITIVE

      // Set up the texture
      for (const t of this.batchTextures.values()) {
        gl.uniform1i(p.textures[t.index], t.index);
        gl.activeTexture(gl.TEXTURE0 + t.index);
        gl.bindTexture(t.texture.target, t.texture.gl);
      }
      gl.activeTexture(gl.TEXTURE0);

      // Draw (vertex stride reduced from 60 to 48 bytes)
      const stride = 48; // 12 * 4 bytes
      gl.vertexAttribPointer(p.position, 2, gl.FLOAT, false, stride, 0);
      gl.vertexAttribPointer(p.texCoord, 2, gl.FLOAT, false, stride, 8);
      gl.vertexAttribIPointer(p.tintColor, 1, gl.UNSIGNED_INT, stride, 16); // Integer attribute for packed color
      gl.vertexAttribPointer(p.viewport, 4, gl.FLOAT, false, stride, 20);
      gl.vertexAttribPointer(p.texId, 3, gl.FLOAT, false, stride, 36);
      gl.enableVertexAttribArray(p.position);
      gl.enableVertexAttribArray(p.texCoord);
      gl.enableVertexAttribArray(p.tintColor);
      gl.enableVertexAttribArray(p.viewport);
      gl.enableVertexAttribArray(p.texId);
      gl.drawElements(gl.TRIANGLES, this.vertices.indexCount, gl.UNSIGNED_SHORT, 0);
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
    this.vertices.reset();
    this.batchTextures = new Map();
    this.batchTextureCount = 0;
  }

  private getTexture(textureBitmap: TextureBitmap): { target: GLenum; format: FormatDesc; gl: WebGLTexture } {
    const gl = this.gl;
    let texture = this.textures.get(textureBitmap.id);
    if (!texture) {
      const t = gl.createTexture();
      if (!t) throw new Error("Failed to create texture");

      const target = targetTable[textureBitmap.source.target];
      if (!target) throw new Error(`Unsupported target: ${textureBitmap.source.target}`);

      const format = glFormatFor(textureBitmap.source.format, this.gl, this.ext);

      texture = { target, format, gl: t };

      gl.bindTexture(target, t);

      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

      gl.texParameteri(target, gl.TEXTURE_BASE_LEVEL, 0);
      gl.texParameteri(target, gl.TEXTURE_MAX_LEVEL, textureBitmap.source.levels);
      // No texture swizzles: https://registry.khronos.org/webgl/specs/latest/2.0/#5.18
      // gl.texParameteri(target, gl.TEXTURE_SWIZZLE_R, format.Swizzles.r);
      // gl.texParameteri(target, gl.TEXTURE_SWIZZLE_G, format.Swizzles.g);
      // gl.texParameteri(target, gl.TEXTURE_SWIZZLE_B, format.Swizzles.b);
      // gl.texParameteri(target, gl.TEXTURE_SWIZZLE_A, format.Swizzles.a);

      if (textureBitmap.source.levels === 1) {
        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      } else {
        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }

      if (textureBitmap.source.flags & TextureFlags.TF_NEAREST) {
        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      } else {
        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }

      if (this.ext.textureAnisotropic) {
        const max = gl.getParameter(this.ext.textureAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
        gl.texParameterf(target, this.ext.textureAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, max));
      }

      if (textureBitmap.source.flags & TextureFlags.TF_CLAMP) {
        gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else {
        gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.REPEAT);
      }

      if (target === gl.TEXTURE_2D_ARRAY) {
        gl.texStorage3D(
          target,
          textureBitmap.source.levels,
          format.internal,
          textureBitmap.source.width,
          textureBitmap.source.height,
          textureBitmap.source.layers,
        );
      } else {
        gl.texStorage2D(
          target,
          textureBitmap.source.levels,
          format.internal,
          textureBitmap.source.width,
          textureBitmap.source.height,
        );
      }

      for (let layer = 0; layer < textureBitmap.source.layers; ++layer) {
        for (let level = 0; level < textureBitmap.source.levels; ++level) {
          if (textureBitmap.source.type === "Image") {
            const image = textureBitmap.source.texture[level];
            if (target === gl.TEXTURE_2D_ARRAY) {
              gl.texSubImage3D(
                target,
                level,
                0,
                0,
                layer,
                image.width,
                image.height,
                1,
                format.external,
                format.type,
                image,
              );
            } else {
              gl.texSubImage2D(target, level, 0, 0, image.width, image.height, format.external, format.type, image);
            }
          } else if (textureBitmap.source.type === "Texture") {
            const extent = textureBitmap.source.texture.extentOf(level);
            const data = textureBitmap.source.texture.dataOf(layer, 0, level);
            if (Format.isCompressed(textureBitmap.source.texture.format)) {
              if (target === gl.TEXTURE_2D_ARRAY) {
                gl.compressedTexSubImage3D(target, level, 0, 0, layer, extent[0], extent[1], 1, format.internal, data);
              } else {
                gl.compressedTexSubImage2D(target, level, 0, 0, extent[0], extent[1], format.internal, data);
              }
            } else {
              if (target === gl.TEXTURE_2D_ARRAY) {
                gl.texSubImage3D(
                  target,
                  level,
                  0,
                  0,
                  layer,
                  extent[0],
                  extent[1],
                  1,
                  format.external,
                  format.type,
                  new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
                );
              } else {
                gl.texSubImage2D(
                  target,
                  level,
                  0,
                  0,
                  extent[0],
                  extent[1],
                  format.external,
                  format.type,
                  new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
                );
              }
            }
          } else {
            const _: never = textureBitmap.source;
          }
        }
      }

      this.textures.set(textureBitmap.id, texture);
      // console.log("Created texture", textureBitmap.id, textureBitmap.source);
    }
    return texture;
  }
}

const targetTable: Record<Target, number | undefined> = {
  [Target.TARGET_1D]: undefined,
  [Target.TARGET_1D_ARRAY]: undefined,
  [Target.TARGET_2D]: WebGL2RenderingContext.TEXTURE_2D,
  [Target.TARGET_2D_ARRAY]: WebGL2RenderingContext.TEXTURE_2D_ARRAY,
  [Target.TARGET_3D]: WebGL2RenderingContext.TEXTURE_3D,
  [Target.TARGET_RECT]: undefined,
  [Target.TARGET_RECT_ARRAY]: undefined,
  [Target.TARGET_CUBE]: WebGL2RenderingContext.TEXTURE_CUBE_MAP,
  [Target.TARGET_CUBE_ARRAY]: undefined,
};
