import { Format, Target } from "dds";
import { markEnvironmentError } from "../error.ts";
import { TextureFlags } from "../image.ts";
import { log, tag } from "../logger.ts";
import type { BackendStats, GlyphAtlasTexture, RenderBackend } from "./backend.ts";
import { INSTANCE_STRIDE, InstanceBuffer } from "./instance_buffer.ts";
import type { TextureBitmap } from "../image.ts";
import { type FormatDesc, glFormatFor } from "./webgl.ts";

type BackendTexture = {
  target: GLenum;
  format: FormatDesc;
  gl: WebGLTexture;
};

const vertexShaderSource = `#version 300 es
uniform mat4 u_MvpMatrix;

in vec4 a_Coords0;
in vec4 a_Coords1;
in vec4 a_TexCoords0;
in vec4 a_TexCoords1;
in vec4 a_Viewport;
in vec4 a_TexId;
in uint a_TintColor;

out vec2 v_ScreenPos;
out vec2 v_TexCoord;
out vec4 v_TintColor;
out vec4 v_Viewport;
out vec4 v_TexId;

void main(void) {
    int corners[6] = int[6](0, 1, 2, 0, 2, 3);
    vec2 coords[4] = vec2[4](a_Coords0.xy, a_Coords0.zw, a_Coords1.xy, a_Coords1.zw);
    vec2 texCoords[4] = vec2[4](a_TexCoords0.xy, a_TexCoords0.zw, a_TexCoords1.xy, a_TexCoords1.zw);
    int corner = corners[gl_VertexID];
    v_TexCoord = texCoords[corner];
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
    vec4 pos = u_MvpMatrix * vec4(coords[corner] + a_Viewport.xy, 0.0, 1.0);
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
in vec4 v_TexId;

out vec4 f_fragColor;

void main(void) {
    float x = v_ScreenPos[0], y = v_ScreenPos[1];
    if (x < v_Viewport[0] || x >= v_Viewport[2] || y < v_Viewport[1] || y >= v_Viewport[3]) {
      discard;
    }
    vec4 color;
    ${switchCode}
    if (v_TexId.w > 0.5)
      color = vec4(1.0, 1.0, 1.0, color.r);
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

export class WebGL2Backend implements RenderBackend {
  readonly name = "WebGL2" as const;
  private readonly gl: WebGL2RenderingContext;
  private readonly ext: {
    textureBptc: EXT_texture_compression_bptc | null;
    textureS3tc: WEBGL_compressed_texture_s3tc | null;
    textureAnisotropic: EXT_texture_filter_anisotropic | null;
  };

  private readonly textureProgram: ShaderProgram<{
    coords0: number;
    coords1: number;
    texCoords0: number;
    texCoords1: number;
    tintColor: number;
    viewport: number;
    texId: number;
    mvpMatrix: WebGLUniformLocation;
    textures: WebGLUniformLocation[];
  }>;

  private readonly textures: Map<string, BackendTexture> = new Map();
  private readonly glyphTextures: Map<string, BackendTexture> = new Map();
  private viewport: number[] = [];
  private pixelRatio = 1;
  private instances = new InstanceBuffer();
  private drawCount = 0;
  private readonly vbo: WebGLBuffer;
  private readonly vao: WebGLVertexArrayObject;
  private vboSize = 0;
  private readonly maxTextures: number;
  private batchTextures: Map<
    string,
    { index: number; texture: BackendTexture }
  > = new Map();
  private batchTextureCount = 0;
  private dispatchCount = 0;
  private instanceCount = 0;
  private instanceBytes = 0;

  get canvas(): OffscreenCanvas {
    return this._canvas;
  }
  private readonly _canvas: OffscreenCanvas;

  get supportsBptc(): boolean {
    return this.ext.textureBptc !== null;
  }

  get contextLost(): boolean {
    return this.gl.isContextLost();
  }

  constructor(
    canvas: OffscreenCanvas,
    onContextEvent?: (event: "context-lost" | "context-restored", data: Record<string, unknown>) => void,
  ) {
    this._canvas = canvas;

    const gl = canvas.getContext("webgl2", { alpha: false });
    if (!gl) throw markEnvironmentError(new Error("Failed to get WebGL2 context"), "renderingContext");
    this.gl = gl;
    canvas.addEventListener("contextlost", () => {
      onContextEvent?.("context-lost", { contextLost: gl.isContextLost(), width: canvas.width, height: canvas.height });
    });
    canvas.addEventListener("contextrestored", () => {
      onContextEvent?.("context-restored", {
        contextLost: gl.isContextLost(),
        width: canvas.width,
        height: canvas.height,
      });
    });

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

    this.maxTextures = Math.min(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number, 100);

    this.textureProgram = new ShaderProgram(
      gl,
      vertexShaderSource,
      textureFragmentShaderSource(this.maxTextures),
      (program) => {
        const coords0 = gl.getAttribLocation(program, "a_Coords0");
        const coords1 = gl.getAttribLocation(program, "a_Coords1");
        const texCoords0 = gl.getAttribLocation(program, "a_TexCoords0");
        const texCoords1 = gl.getAttribLocation(program, "a_TexCoords1");

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
          coords0,
          coords1,
          texCoords0,
          texCoords1,
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

    // Create and setup VAO
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create vertex array object");
    this.vao = vao;

    // Bind VAO and setup vertex attributes once
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    this.textureProgram.use((p) => {
      const stride = INSTANCE_STRIDE;
      for (
        const [location, offset] of [
          [p.coords0, 0],
          [p.coords1, 16],
          [p.texCoords0, 32],
          [p.texCoords1, 48],
          [p.viewport, 64],
          [p.texId, 80],
        ]
      ) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 4, gl.FLOAT, false, stride, offset);
        gl.vertexAttribDivisor(location, 1);
      }
      gl.enableVertexAttribArray(p.tintColor);
      gl.vertexAttribIPointer(p.tintColor, 1, gl.UNSIGNED_INT, stride, 96);
      gl.vertexAttribDivisor(p.tintColor, 1);
    });

    gl.bindVertexArray(null);

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
    this.dispatchCount = 0;
    this.instanceCount = 0;
    this.instanceBytes = 0;
  }

  getStats(): BackendStats {
    return {
      name: this.name,
      instances: this.instanceCount,
      instanceBytes: this.instanceBytes,
      dispatches: this.dispatchCount,
    };
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

  flush() {
    this.dispatch();
  }

  createGlyphAtlasTexture(id: string, width: number, height: number, layers: number): GlyphAtlasTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create glyph atlas texture");
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.R8, width, height, layers);
    this.glyphTextures.set(id, {
      target: gl.TEXTURE_2D_ARRAY,
      format: { internal: gl.R8, external: gl.RED, type: gl.UNSIGNED_BYTE, properties: 0 },
      gl: texture,
    });
    return { id, width, height, layers, layer: 0 };
  }

  uploadGlyph(
    texture: GlyphAtlasTexture,
    x: number,
    y: number,
    width: number,
    height: number,
    pixels: Uint8Array<ArrayBuffer>,
  ) {
    const stored = this.glyphTextures.get(texture.id);
    if (!stored) throw new Error(`Unknown glyph atlas texture: ${texture.id}`);
    const gl = this.gl;
    gl.bindTexture(stored.target, stored.gl);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage3D(stored.target, 0, x, y, texture.layer, width, height, 1, gl.RED, gl.UNSIGNED_BYTE, pixels);
  }

  destroyGlyphAtlasTexture(texture: GlyphAtlasTexture) {
    const stored = this.glyphTextures.get(texture.id);
    if (!stored) return;
    this.gl.deleteTexture(stored.gl);
    this.glyphTextures.delete(texture.id);
  }

  drawQuad(
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
    textureBitmap: TextureBitmap | GlyphAtlasTexture,
    packedColor: number,
    textureLayer: number,
    maskLayer: number,
    glyph: boolean,
  ) {
    if (!glyph) this.drawCount++;
    const texture = glyph ? this.glyphTextures.get(textureBitmap.id) : this.getTexture(textureBitmap as TextureBitmap);
    if (!texture) throw new Error(`Unknown glyph atlas texture: ${textureBitmap.id}`);
    const slot = this.bindBatchTexture(textureBitmap.id, texture);
    if (!glyph && (textureBitmap as TextureBitmap).updateSubImage) {
      const gl = this.gl;
      gl.bindTexture(texture.target, texture.gl);

      const sub = (textureBitmap as TextureBitmap).updateSubImage!();
      gl.texSubImage3D(
        texture.target,
        0,
        sub.x,
        sub.y,
        0,
        sub.width,
        sub.height,
        1,
        texture.format.external,
        texture.format.type,
        sub.source,
      );
    }

    this.instances.pushQuad(
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
      this.viewport[0],
      this.viewport[1],
      this.viewport[2],
      this.viewport[3],
      slot,
      textureLayer,
      maskLayer,
      glyph,
      packedColor,
    );
  }

  private bindBatchTexture(id: string, texture: BackendTexture) {
    let batched = this.batchTextures.get(id);
    if (!batched) {
      if (this.batchTextures.size >= this.maxTextures) this.dispatch();
      batched = { index: this.batchTextureCount++, texture };
      this.batchTextures.set(id, batched);
    }
    return batched.index;
  }

  private dispatch() {
    if (this.instances.length === 0) return;

    this.dispatchCount++;

    const gl = this.gl;

    // Bind VAO - all vertex attributes are already configured
    gl.bindVertexArray(this.vao);

    // Update vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const bufferData = this.instances.data;
    this.instanceCount += this.instances.length;
    this.instanceBytes += bufferData.byteLength;
    const requiredSize = bufferData.byteLength;

    if (requiredSize > this.vboSize) {
      gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STREAM_DRAW);
      this.vboSize = requiredSize;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, bufferData);
    }

    this.textureProgram.use((p) => {
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

      // Draw - VAO already has all vertex attributes configured
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instances.length);
    });

    // Unbind VAO
    gl.bindVertexArray(null);

    this.resetBatch();
  }

  private resetBatch() {
    this.instances.reset();
    this.batchTextures = new Map();
    this.batchTextureCount = 0;
  }

  private getTexture(textureBitmap: TextureBitmap): BackendTexture {
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
