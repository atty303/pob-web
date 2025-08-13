/// <reference path="./webgpu-types.d.ts" />

import { Format, Target } from "dds/src";
import { TextureFlags } from "../image";
import { log, tag } from "../logger";
import type { RenderBackend } from "./backend";
import type { TextureBitmap } from "./renderer";

const vertexShaderSource = `
struct Uniforms {
  mvpMatrix: mat4x4<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) texCoord: vec2<f32>,
  @location(2) tintColor: vec4<f32>,
  @location(3) viewport: vec4<f32>,
  @location(4) texId: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) screenPos: vec2<f32>,
  @location(1) texCoord: vec2<f32>,
  @location(2) tintColor: vec4<f32>,
  @location(3) viewport: vec4<f32>,
  @location(4) texId: vec3<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.texCoord = input.texCoord;
  output.tintColor = input.tintColor;
  output.texId = input.texId;
  
  let vp0 = input.viewport.xy + vec2<f32>(0.0, input.viewport.w);
  let vp1 = input.viewport.xy + vec2<f32>(input.viewport.z, 0.0);
  output.viewport = vec4<f32>(
    (uniforms.mvpMatrix * vec4<f32>(vp0, 0.0, 1.0)).xy,
    (uniforms.mvpMatrix * vec4<f32>(vp1, 0.0, 1.0)).xy
  );
  
  let pos = uniforms.mvpMatrix * vec4<f32>(input.position + input.viewport.xy, 0.0, 1.0);
  output.screenPos = pos.xy;
  output.position = pos;
  
  return output;
}
`;

const fragmentShaderSource = (maxTextures: number) => {
  let switchCode = "";
  for (let i = 0; i < maxTextures; ++i) {
    if (i === 0) {
      switchCode += `  if (input.texId.x < ${i}.5) `;
    } else if (i === maxTextures - 1) {
      switchCode += "  else ";
    } else {
      switchCode += `  else if (input.texId.x < ${i}.5) `;
    }
    switchCode += `{
    color = textureSample(textures${i}, linearSampler, input.texCoord, i32(input.texId.y));
    if (input.texId.z > -0.5) {
      color = color * textureSample(textures${i}, linearSampler, input.texCoord, i32(input.texId.z));
    }
  }
`;
  }

  return `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) screenPos: vec2<f32>,
  @location(1) texCoord: vec2<f32>,
  @location(2) tintColor: vec4<f32>,
  @location(3) viewport: vec4<f32>,
  @location(4) texId: vec3<f32>,
}

@group(0) @binding(1) var linearSampler: sampler;
${Array.from({ length: maxTextures }, (_, i) => `@group(0) @binding(${i + 2}) var textures${i}: texture_2d_array<f32>;`).join("\n")}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let x = input.screenPos.x;
  let y = input.screenPos.y;
  
  if (x < input.viewport.x || x >= input.viewport.z || y < input.viewport.y || y >= input.viewport.w) {
    discard;
  }
  
  var color: vec4<f32>;
${switchCode}
  
  return color * input.tintColor;
}
`;
};

function orthoMatrix(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Float32Array {
  return new Float32Array([
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
  ]);
}

class VertexBuffer {
  private _buffer: Float32Array;
  private offset: number;

  constructor() {
    this._buffer = new Float32Array(1024 * 1024);
    this.offset = 0;
  }

  get buffer() {
    return new Float32Array(this._buffer.buffer, 0, this.offset);
  }

  get length() {
    return this.offset / 15;
  }

  push(
    i: number,
    coords: number[],
    texCoords: number[],
    tintColor: number[],
    viewport: number[],
    textureSlot: number,
    stackLayer: number,
    maskLayer: number,
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
    b[this.offset++] = stackLayer;
    b[this.offset++] = maskLayer;
  }
}

export class WebGPUBackend implements RenderBackend {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private sampler: GPUSampler | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private initialized = false;
  private initPromise: Promise<void>;

  private textures: Map<
    string,
    {
      texture: GPUTexture;
      format: GPUTextureFormat;
    }
  > = new Map();

  private viewport: number[] = [];
  private pixelRatio = 1;
  private vertices: VertexBuffer = new VertexBuffer();
  private drawCount = 0;
  private maxTextures = 16; // WebGPU typically supports at least 16 texture bindings
  private batchTextures: Map<
    string,
    {
      index: number;
      texture: GPUTexture;
    }
  > = new Map();
  private batchTextureCount = 0;
  private dispatchCount = 0;
  private defaultWhiteTexture: GPUTexture | null = null;

  get canvas(): OffscreenCanvas {
    return this._canvas;
  }
  private readonly _canvas: OffscreenCanvas;

  constructor(canvas: OffscreenCanvas) {
    this._canvas = canvas;
    this.initPromise = this.init();
  }

  async waitForInit() {
    await this.initPromise;
  }

  private async init() {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU not supported");
    }

    this.device = await adapter.requestDevice();

    const context = this._canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context");
    }
    this.context = context;

    const presentationFormat = navigator.gpu?.getPreferredCanvasFormat() ?? "bgra8unorm";
    context.configure({
      device: this.device,
      format: presentationFormat,
      alphaMode: "opaque",
    });

    // Create sampler
    this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });

    // Create bind group layout
    const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
    ];

    // Add texture bindings
    for (let i = 0; i < this.maxTextures; i++) {
      bindGroupLayoutEntries.push({
        binding: i + 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          viewDimension: "2d-array",
          sampleType: "float",
        },
      });
    }

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: bindGroupLayoutEntries,
    });

    // Create pipeline
    const vertexModule = this.device.createShaderModule({
      code: vertexShaderSource,
    });

    const fragmentModule = this.device.createShaderModule({
      code: fragmentShaderSource(this.maxTextures),
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      vertex: {
        module: vertexModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 60, // 15 floats * 4 bytes
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" }, // position
              { shaderLocation: 1, offset: 8, format: "float32x2" }, // texCoord
              { shaderLocation: 2, offset: 16, format: "float32x4" }, // tintColor
              { shaderLocation: 3, offset: 32, format: "float32x4" }, // viewport
              { shaderLocation: 4, offset: 48, format: "float32x3" }, // texId
            ],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: presentationFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    // Create uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 64, // 4x4 matrix
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create vertex buffer
    this.vertexBuffer = this.device.createBuffer({
      size: 1024 * 1024 * 4, // Match WebGL backend size
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.setViewport(0, 0, this._canvas.width, this._canvas.height);

    // Create default white texture
    this.defaultWhiteTexture = this.createDefaultTexture();

    this.initialized = true;
    log.info(tag.backend, "WebGPU backend initialized");
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
    if (!this.initialized) {
      // Skip rendering if not initialized yet
      return;
    }
    this.dispatch();
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

    if (textureBitmap.updateSubImage && this.device) {
      const sub = textureBitmap.updateSubImage();
      this.device.queue.writeTexture(
        { texture: t.texture, origin: { x: sub.x, y: sub.y } },
        sub.source as ArrayBufferView,
        { bytesPerRow: sub.width * 4 }, // Assuming RGBA8
        { width: sub.width, height: sub.height, depthOrArrayLayers: 1 },
      );
    }

    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.vertices.push(i, coords, texCoords, tintColor, this.viewport, t.index, stackLayer, maskLayer);
    }
  }

  private dispatch() {
    if (!this.device || !this.context || !this.pipeline || this.vertices.length === 0) return;

    this.dispatchCount++;

    // Update uniform buffer
    const matrix = orthoMatrix(0, this.canvas.width, this.canvas.height, 0, -9999, 9999);
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, matrix);

    // Update vertex buffer
    this.device.queue.writeBuffer(this.vertexBuffer!, 0, this.vertices.buffer);

    // Create bind group
    const bindGroupEntries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: this.uniformBuffer! } },
      { binding: 1, resource: this.sampler! },
    ];

    // Add textures to bind group
    const textureArray = Array.from(this.batchTextures.values());
    for (let i = 0; i < this.maxTextures; i++) {
      const texture = i < textureArray.length ? textureArray[i].texture : this.defaultWhiteTexture!;
      bindGroupEntries.push({
        binding: i + 2,
        resource: texture.createView({ dimension: "2d-array" }),
      });
    }

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout!,
      entries: bindGroupEntries,
    });

    // Record commands
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer!);
    renderPass.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1);
    renderPass.draw(this.vertices.length);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    this.resetBatch();
  }

  private resetBatch() {
    this.vertices = new VertexBuffer();
    this.batchTextures = new Map();
    this.batchTextureCount = 0;
  }

  private createDefaultTexture(): GPUTexture {
    if (!this.device) throw new Error("Device not initialized");

    const texture = this.device.createTexture({
      size: { width: 8, height: 8, depthOrArrayLayers: 1 },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      dimension: "2d",
    });

    const data = new Uint8Array(8 * 8 * 4).fill(255);
    this.device.queue.writeTexture(
      { texture },
      data,
      { bytesPerRow: 8 * 4 },
      { width: 8, height: 8, depthOrArrayLayers: 1 },
    );

    return texture;
  }

  private getTexture(textureBitmap: TextureBitmap): GPUTexture {
    if (!this.device) throw new Error("Device not initialized");

    let texture = this.textures.get(textureBitmap.id);
    if (!texture) {
      const source = textureBitmap.source;

      // Determine format - default to rgba8unorm for now
      // TODO: Add proper format mapping based on source.format
      const format: GPUTextureFormat = "rgba8unorm";

      const gpuTexture = this.device.createTexture({
        size: {
          width: source.width,
          height: source.height,
          depthOrArrayLayers: source.layers,
        },
        format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        mipLevelCount: source.levels,
        dimension: "2d",
      });

      // Upload texture data
      for (let layer = 0; layer < source.layers; ++layer) {
        for (let level = 0; level < source.levels; ++level) {
          if (source.type === "Image") {
            const image = source.texture[level];
            // Handle different image types
            let imageData: Uint8ClampedArray;
            if ("data" in image) {
              imageData = (image as ImageData).data;
            } else {
              // For ImageBitmap/OffscreenCanvas, we'd need to render to canvas and get ImageData
              // For now, skip these
              continue;
            }
            this.device.queue.writeTexture(
              { texture: gpuTexture, mipLevel: level, origin: { z: layer } },
              imageData,
              { bytesPerRow: image.width * 4 },
              { width: image.width, height: image.height, depthOrArrayLayers: 1 },
            );
          } else if (source.type === "Texture") {
            const extent = source.texture.extentOf(level);
            const data = source.texture.dataOf(layer, 0, level);

            if (!Format.isCompressed(source.texture.format)) {
              this.device.queue.writeTexture(
                { texture: gpuTexture, mipLevel: level, origin: { z: layer } },
                new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
                { bytesPerRow: extent[0] * 4 }, // Assuming 4 bytes per pixel
                { width: extent[0], height: extent[1], depthOrArrayLayers: 1 },
              );
            }
            // Compressed formats would need special handling
          }
        }
      }

      texture = { texture: gpuTexture, format };
      this.textures.set(textureBitmap.id, texture);
    }

    return texture.texture;
  }
}
