import { D3dFmt, Ddpf, Format, Swizzle } from "./format";
import { StorageLinear } from "./storage";

export class Texture {
  private baseLayer: number;
  private maxLayer: number;
  private baseFace: number;
  private maxFace: number;
  private baseLevel: number;
  private maxLevel: number;
  private cache: Cache;
  public data: DataView = new DataView(new ArrayBuffer(0));

  constructor(
    readonly target: Target,
    readonly format: Format,
    readonly extent: [number, number, number],
    readonly layers: number,
    readonly faces: number,
    readonly levels: number,
    readonly swizzles: [Swizzle, Swizzle, Swizzle, Swizzle] = [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA],
  ) {
    this.baseLayer = 0;
    this.maxLayer = this.layers - 1;
    this.baseFace = 0;
    this.maxFace = this.faces - 1;
    this.baseLevel = 0;
    this.maxLevel = this.levels - 1;
    this.cache = new Cache(
      new StorageLinear(this.format, this.extent, this.layers, this.faces, this.levels),
      this.format,
      this.baseLayer,
      this.layers,
      this.baseFace,
      this.maxFace,
      this.baseLevel,
      this.maxLevel,
    );
  }

  get size() {
    return this.cache.getMemorySize();
  }

  sizeOf(level: number) {
    return this.cache.getMemorySize(level);
  }

  extentOf(level: number) {
    return this.cache.getExtent(level);
  }

  dataOf(layer: number, face: number, level: number) {
    return new DataView(
      this.data.buffer,
      this.data.byteOffset + this.cache.getBaseAddress(layer, face, level),
      this.sizeOf(level),
    );
  }
}

export type DDSImage = Texture;

/// Texture target: type/shape of the texture storage_linear
export enum Target {
  TARGET_1D = 0,
  TARGET_FIRST = TARGET_1D,
  TARGET_1D_ARRAY = 1,
  TARGET_2D = 2,
  TARGET_2D_ARRAY = 3,
  TARGET_3D = 4,
  TARGET_RECT = 5,
  TARGET_RECT_ARRAY = 6,
  TARGET_CUBE = 7,
  TARGET_CUBE_ARRAY = 8,
  TARGET_LAST = TARGET_CUBE_ARRAY,
}

enum DDSFlag {
  CAPS = 0x00000001,
  HEIGHT = 0x00000002,
  WIDTH = 0x00000004,
  PITCH = 0x00000008,
  PIXELFORMAT = 0x00001000,
  MIPMAPCOUNT = 0x00020000,
  LINEARSIZE = 0x00080000,
  DEPTH = 0x00800000,
}

enum DDSCubemapFlag {
  CUBEMAP = 0x00000200,
  CUBEMAP_POSITIVEX = 0x00000400,
  CUBEMAP_NEGATIVEX = 0x00000800,
  CUBEMAP_POSITIVEY = 0x00001000,
  CUBEMAP_NEGATIVEY = 0x00002000,
  CUBEMAP_POSITIVEZ = 0x00004000,
  CUBEMAP_NEGATIVEZ = 0x00008000,
  VOLUME = 0x00200000,
  ALLFACES = CUBEMAP_POSITIVEX |
    CUBEMAP_NEGATIVEX |
    CUBEMAP_POSITIVEY |
    CUBEMAP_NEGATIVEY |
    CUBEMAP_POSITIVEZ |
    CUBEMAP_NEGATIVEZ,
}

enum D3D10ResourceDimension {
  UNKNOWN = 0,
  BUFFER = 1,
  TEXTURE1D = 2,
  TEXTURE2D = 3,
  TEXTURE3D = 4,
}

enum D3D10ResourceMiscFlag {
  GENERATE_MIPS = 0x01,
  SHARED = 0x02,
  TEXTURECUBE = 0x04,
  SHARED_KEYEDMUTEX = 0x10,
  GDI_COMPATIBLE = 0x20,
}

function parseHeader(header: DataView) {
  const size = header.getUint32(4, true);
  const flags = header.getUint32(8, true);
  const height = header.getUint32(12, true);
  const width = header.getUint32(16, true);
  const pitch = header.getUint32(20, true);
  const depth = header.getUint32(24, true);
  const mipMapLevels = header.getUint32(28, true);
  // 32 - 76 = reserved
  const format = parsePixelFormat(header);
  const surfaceFlags = header.getUint32(108, true);
  const cubemapFlags = header.getUint32(112, true);
  // 116 - 128 = reserved

  return {
    size,
    flags,
    height,
    width,
    pitch,
    depth,
    mipMapLevels,
    format,
    surfaceFlags,
    cubemapFlags,
  };
}

function parsePixelFormat(header: DataView) {
  const flags = header.getUint32(80, true);
  const fourCC = header.getUint32(84, true);
  const bpp = header.getUint32(88, true);
  const mask0 = header.getUint32(92, true);
  const mask1 = header.getUint32(96, true);
  const mask2 = header.getUint32(100, true);
  const mask3 = header.getUint32(104, true);

  return {
    flags,
    fourCC,
    bpp,
    mask: [mask0, mask1, mask2, mask3] as const,
  };
}

function parseHeader10(header: DataView) {
  const format = header.getUint32(0, true);
  const resourceDimension = header.getUint32(4, true);
  const miscFlag = header.getUint32(8, true);
  const arraySize = header.getUint32(12, true);
  const alphaFlags = header.getUint32(16, true);

  return {
    format,
    resourceDimension,
    miscFlag,
    arraySize,
    alphaFlags,
  };
}

function parseTarget(header: ReturnType<typeof parseHeader>, header10: ReturnType<typeof parseHeader10>) {
  if (header.cubemapFlags & DDSCubemapFlag.CUBEMAP || header10.miscFlag & D3D10ResourceMiscFlag.TEXTURECUBE) {
    if (header10.arraySize > 1) {
      return Target.TARGET_CUBE_ARRAY;
    } else {
      return Target.TARGET_CUBE;
    }
  } else if (header10.arraySize > 1) {
    if (header.flags & DDSFlag.HEIGHT) {
      return Target.TARGET_2D_ARRAY;
    } else {
      return Target.TARGET_1D_ARRAY;
    }
  } else if (header10.resourceDimension === D3D10ResourceDimension.TEXTURE1D) {
    return Target.TARGET_1D;
  } else if (
    header10.resourceDimension === D3D10ResourceDimension.TEXTURE3D ||
    header.flags & DDSFlag.DEPTH ||
    header.cubemapFlags & DDSCubemapFlag.VOLUME
  ) {
    return Target.TARGET_3D;
  } else {
    return Target.TARGET_2D;
  }
}

// https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide#dds-file-layout
export const parseDDSDX10 = (data: Uint8Array): Texture => {
  const headerView = new DataView(data.buffer, data.byteOffset, 128);

  const magic = headerView.getUint32(0, true);
  if (magic !== 0x20534444) {
    // 'DDS '
    throw new Error("Invalid DDS magic number");
  }

  const header = parseHeader(headerView);
  let offset = 128;

  let header10: ReturnType<typeof parseHeader10> = {
    format: 0,
    resourceDimension: 0,
    miscFlag: 0,
    arraySize: 0,
    alphaFlags: 0,
  };
  if (
    header.format.flags & Ddpf.FOURCC &&
    (header.format.fourCC === D3dFmt.DX10 || header.format.fourCC === D3dFmt.GLI1)
  ) {
    header10 = parseHeader10(new DataView(data.buffer, offset, 20));
    offset += 20;
  }

  let format: Format = Format.UNDEFINED;
  if (
    header.format.flags & (Ddpf.RGB | Ddpf.ALPHAPIXELS | Ddpf.ALPHA | Ddpf.YUV | Ddpf.LUMINANCE) &&
    header.format.bpp > 0 &&
    header.format.bpp < 64
  ) {
    switch (header.format.bpp) {
      case 8:
        if (maskEquals(header.format.mask, Format.info(Format.RG4_UNORM_PACK8).mask)) {
          format = Format.RG4_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.L8_UNORM_PACK8).mask)) {
          format = Format.L8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.A8_UNORM_PACK8).mask)) {
          format = Format.A8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.R8_UNORM_PACK8).mask)) {
          format = Format.R8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.RG3B2_UNORM_PACK8).mask)) {
          format = Format.RG3B2_UNORM_PACK8;
        } else {
          throw new Error("Unsupported DDS format");
        }
        break;
      case 16:
        if (maskEquals(header.format.mask, Format.info(Format.RGBA4_UNORM_PACK16).mask)) {
          format = Format.RGBA4_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.BGRA4_UNORM_PACK16).mask)) {
          format = Format.BGRA4_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.R5G6B5_UNORM_PACK16).mask)) {
          format = Format.R5G6B5_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.B5G6R5_UNORM_PACK16).mask)) {
          format = Format.B5G6R5_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.RGB5A1_UNORM_PACK16).mask)) {
          format = Format.RGB5A1_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.BGR5A1_UNORM_PACK16).mask)) {
          format = Format.BGR5A1_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.LA8_UNORM_PACK8).mask)) {
          format = Format.LA8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.RG8_UNORM_PACK8).mask)) {
          format = Format.RG8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.L16_UNORM_PACK16).mask)) {
          format = Format.L16_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.A16_UNORM_PACK16).mask)) {
          format = Format.A16_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.R16_UNORM_PACK16).mask)) {
          format = Format.R16_UNORM_PACK16;
        } else {
          throw new Error("Unsupported DDS format");
        }
        break;
      case 24:
        if (maskEquals(header.format.mask, Format.info(Format.RGB8_UNORM_PACK8).mask)) {
          format = Format.RGB8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.BGR8_UNORM_PACK8).mask)) {
          format = Format.BGR8_UNORM_PACK8;
        } else {
          throw new Error("Unsupported DDS format");
        }
        break;
      case 32:
        if (maskEquals(header.format.mask, Format.info(Format.BGR8_UNORM_PACK32).mask)) {
          format = Format.BGR8_UNORM_PACK32;
        } else if (maskEquals(header.format.mask, Format.info(Format.BGRA8_UNORM_PACK8).mask)) {
          format = Format.BGRA8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.RGBA8_UNORM_PACK8).mask)) {
          format = Format.RGBA8_UNORM_PACK8;
        } else if (maskEquals(header.format.mask, Format.info(Format.RGB10A2_UNORM_PACK32).mask)) {
          format = Format.RGB10A2_UNORM_PACK32;
        } else if (maskEquals(header.format.mask, Format.info(Format.LA16_UNORM_PACK16).mask)) {
          format = Format.LA16_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.RG16_UNORM_PACK16).mask)) {
          format = Format.RG16_UNORM_PACK16;
        } else if (maskEquals(header.format.mask, Format.info(Format.R32_SFLOAT_PACK32).mask)) {
          format = Format.R32_SFLOAT_PACK32;
          throw new Error("Unsupported DDS format");
        }
        break;
      default:
        throw new Error("Unsupported DDS format");
    }
  } else if (
    header.format.flags & Ddpf.FOURCC &&
    header.format.fourCC !== D3dFmt.DX10 &&
    header.format.fourCC !== D3dFmt.GLI1
  ) {
    let fourCC = header.format.fourCC;
    switch (header.format.fourCC) {
      case D3dFmt.BC4U:
        fourCC = D3dFmt.ATI1;
        break;
      case D3dFmt.BC4S:
        fourCC = D3dFmt.AT1N;
        break;
      case D3dFmt.BC5U:
        fourCC = D3dFmt.ATI2;
        break;
      case D3dFmt.BC5S:
        fourCC = D3dFmt.AT2N;
        break;
    }
    format = Format.find(fourCC);
  } else if (header10 && (header.format.fourCC === D3dFmt.DX10 || header.format.fourCC === D3dFmt.GLI1)) {
    format = Format.find(header.format.fourCC, header10.format);
  }

  const mipMapCount = header.flags & DDSFlag.MIPMAPCOUNT ? header.mipMapLevels : 1;

  let faceCount = 1;
  if (header.cubemapFlags & DDSCubemapFlag.CUBEMAP) {
    const countBits = (v: number): number => {
      let n = v;
      let count = 0;
      while (n) {
        count += n & 1; // Increment count if the least significant bit is 1
        n >>= 1; // Right shift to process the next bit
      }
      return count;
    };

    faceCount = countBits(header.cubemapFlags & DDSCubemapFlag.ALLFACES);
  } else if (header10.miscFlag & D3D10ResourceMiscFlag.TEXTURECUBE) {
    faceCount = 6;
  }

  let depthCount = 1;
  if (header.cubemapFlags & DDSCubemapFlag.VOLUME) {
    depthCount = header.depth;
  }

  const texture = new Texture(
    parseTarget(header, header10),
    format,
    [header.width, header.height, depthCount],
    Math.max(header10.arraySize, 1),
    faceCount,
    mipMapCount,
  );
  console.log("DDS texture created", texture);

  const sourceSize = offset + texture.size;
  if (data.byteLength !== sourceSize) {
    throw new Error(`Invalid DDS size: actual ${data.byteLength} !== expected ${sourceSize}`);
  }

  texture.data = new DataView(data.buffer, data.byteOffset + offset, texture.size);

  return texture;
};

function maskEquals(l: readonly [number, number, number, number], r: readonly [number, number, number, number]) {
  return l[0] === r[0] && l[1] === r[1] && l[2] === r[2] && l[3] === r[3];
}

class Cache {
  readonly faces: number;
  readonly levels: number;
  readonly baseAddresses: number[];
  readonly imageExtent: [number, number, number][];
  readonly imageMemorySize: number[];
  readonly globalMemorySize: number;

  constructor(
    readonly storage: StorageLinear,
    readonly format: Format,
    readonly baseLayer: number,
    readonly layers: number,
    readonly baseFace: number,
    readonly maxFace: number,
    readonly baseLevel: number,
    readonly maxLevel: number,
  ) {
    this.faces = this.maxFace - this.baseFace + 1;
    this.levels = this.maxLevel - this.baseLevel + 1;

    this.baseAddresses = new Array(this.layers * this.faces * this.levels);
    for (let layer = 0; layer < this.layers; layer++) {
      for (let face = 0; face < this.faces; face++) {
        for (let level = 0; level < this.levels; level++) {
          this.baseAddresses[this.index(layer, face, level)] = this.storage.baseOffset(
            this.baseLayer + layer,
            this.baseFace + face,
            this.baseLevel + level,
          );
        }
      }
    }

    this.imageExtent = new Array(this.levels);
    this.imageMemorySize = new Array(this.levels);
    for (let level = 0; level < this.levels; level++) {
      const srcExtent = this.storage.extent(this.baseLevel + level);
      const dstExtent = [
        (srcExtent[0] * Format.blockExtent(this.format)[0]) / this.storage.blockExtent[0],
        (srcExtent[1] * Format.blockExtent(this.format)[1]) / this.storage.blockExtent[1],
        srcExtent[2],
      ];

      this.imageExtent[level] = [Math.max(dstExtent[0], 1), Math.max(dstExtent[1], 1), Math.max(dstExtent[2], 1)];
      this.imageMemorySize[level] = this.storage.levelSize(this.baseLevel + level);
    }

    this.globalMemorySize =
      this.storage.layerSize(this.baseFace, this.maxFace, this.baseLevel, this.maxLevel) * this.layers;
  }

  getBaseAddress(layer: number, face: number, level: number) {
    return this.baseAddresses[this.index(layer, face, level)];
  }

  getExtent(level: number) {
    return this.imageExtent[level];
  }

  getMemorySize(level?: number) {
    if (level === undefined) {
      return this.globalMemorySize;
    } else {
      return this.imageMemorySize[level];
    }
  }

  private index(layer: number, face: number, level: number) {
    return (layer * this.faces + face) * this.levels + level;
  }
}
