import * as zstd from "@bokuweb/zstd-wasm";

export type ImageInfo = {
  flags: number;
} & (
  | {
      type: "ImageLike";
      bitmap: ImageBitmap | ImageData | OffscreenCanvas | undefined;
    }
  | {
      type: "DDSImage";
      bitmap: DDSImage | undefined;
      dxgiFormat: number | undefined;
    }
);

type DDSImage = {
  width: number;
  height: number;
  mipMapCount: number;
  data: Uint8Array;
  dxgiFormat: number;
};

export enum TextureFlags {
  TF_CLAMP = 1,
  TF_NOMIPMAP = 2,
  TF_NEAREST = 4,
}

let zstdInitialized = false;

export class ImageRepository {
  private readonly prefix: string;
  private images: Map<number, ImageInfo> = new Map();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  async load(handle: number, src: string, flags: number): Promise<void> {
    if (this.images.has(handle)) return;

    const type = src.endsWith(".dds.zst") ? "DDSImage" : "ImageLike";
    const info: ImageInfo = {
      type,
      bitmap: undefined,
      flags,
      dxgiFormat: undefined,
    };
    this.images.set(handle, info);

    const r = await fetch(this.prefix + src, { referrerPolicy: "no-referrer" });
    if (r.ok) {
      const blob = await r.blob();
      if (type === "DDSImage") {
        if (!zstdInitialized) {
          await zstd.init();
          zstdInitialized = true;
        }
        const data = zstd.decompress(new Uint8Array(await blob.arrayBuffer()));
        info.bitmap = parseDDSDX10(data);
      } else {
        info.bitmap = await createImageBitmap(blob);
      }
    }
  }

  get(handle: number): ImageInfo | undefined {
    return this.images.get(handle);
  }
}

// https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide#dds-file-layout
const parseDDSDX10 = (data: Uint8Array): DDSImage => {
  const header = new DataView(data.buffer, data.byteOffset, 128);

  const magic = header.getUint32(0, true);
  if (magic !== 0x20534444) {
    // 'DDS '
    throw new Error("Invalid DDS magic number");
  }

  const height = header.getUint32(12, true);
  const width = header.getUint32(16, true);
  const mipMapCount = header.getUint32(28, true);
  const pixelFormatSize = header.getUint32(72, true);
  const fourCC = header.getUint32(84, true);

  if (fourCC !== 0x30315844) {
    // 'DX10'
    throw new Error("DDS file is not in the DX10 format");
  }

  const dx10Offset = 128;
  const dx10Header = new DataView(data.buffer, dx10Offset, 20);

  const dxgiFormat = dx10Header.getUint32(0, true);
  const resourceDimension = dx10Header.getUint32(4, true);
  const miscFlag = dx10Header.getUint32(8, true);
  const arraySize = dx10Header.getUint32(12, true);
  const miscFlag2 = dx10Header.getUint32(16, true);

  const dataOffset = dx10Offset + 20; // Add DX10 header size
  const dataLength = data.byteLength - dataOffset;

  const image: DDSImage = {
    width,
    height,
    mipMapCount: mipMapCount || 1,
    data: data.subarray(dataOffset, dataOffset + dataLength),
    dxgiFormat,
  };

  console.debug("DDS loaded", image);

  return image;
};
