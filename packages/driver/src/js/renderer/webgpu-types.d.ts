// Minimal WebGPU type declarations for TypeScript compilation
// These are simplified versions - full types available at @webgpu/types

interface Navigator {
  readonly gpu?: GPU;
}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): GPUTextureFormat;
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

interface GPUDevice {
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
  createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  readonly queue: GPUQueue;
}

interface GPUCanvasContext {
  configure(configuration: GPUCanvasConfiguration): void;
  getCurrentTexture(): GPUTexture;
}

interface OffscreenCanvas {
  getContext(contextId: "webgpu"): GPUCanvasContext | null;
}

// Simplified type definitions - using unknown instead of any for type safety
type GPURequestAdapterOptions = unknown;
type GPUDeviceDescriptor = unknown;
type GPUShaderModuleDescriptor = { code: string };
type GPURenderPipelineDescriptor = unknown;
type GPUBufferDescriptor = { size: number; usage: number };
type GPUTextureDescriptor = {
  size: { width: number; height: number; depthOrArrayLayers?: number };
  format: string;
  usage: number;
  dimension?: string;
  mipLevelCount?: number;
};
type GPUSamplerDescriptor = unknown;
type GPUBindGroupLayoutDescriptor = { entries: unknown[] };
type GPUPipelineLayoutDescriptor = { bindGroupLayouts: GPUBindGroupLayout[] };
type GPUBindGroupDescriptor = { layout: GPUBindGroupLayout; entries: unknown[] };
type GPUCommandEncoderDescriptor = unknown;
type GPUCanvasConfiguration = { device: GPUDevice; format: string; alphaMode?: string };
type GPUTextureFormat = string;

type GPUShaderModule = object;
type GPURenderPipeline = object;
type GPUBuffer = object;
interface GPUTexture {
  createView(descriptor?: unknown): unknown;
}
type GPUSampler = object;
type GPUBindGroupLayout = object;
type GPUPipelineLayout = object;
type GPUBindGroup = object;
interface GPUCommandEncoder {
  beginRenderPass(descriptor: unknown): GPURenderPassEncoder;
  finish(): unknown;
}
interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
  setVertexBuffer(slot: number, buffer: GPUBuffer): void;
  setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): void;
  draw(vertexCount: number): void;
  end(): void;
}
interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, offset: number, data: ArrayBufferView): void;
  writeTexture(destination: unknown, data: ArrayBufferView, dataLayout: unknown, size: unknown): void;
  submit(commandBuffers: unknown[]): void;
}

type GPUBindGroupLayoutEntry = unknown;
type GPUBindGroupEntry = unknown;

declare const GPUShaderStage: {
  VERTEX: number;
  FRAGMENT: number;
  COMPUTE: number;
};

declare const GPUBufferUsage: {
  MAP_READ: number;
  MAP_WRITE: number;
  COPY_SRC: number;
  COPY_DST: number;
  INDEX: number;
  VERTEX: number;
  UNIFORM: number;
  STORAGE: number;
  INDIRECT: number;
  QUERY_RESOLVE: number;
};

declare const GPUTextureUsage: {
  COPY_SRC: number;
  COPY_DST: number;
  TEXTURE_BINDING: number;
  STORAGE_BINDING: number;
  RENDER_ATTACHMENT: number;
};
