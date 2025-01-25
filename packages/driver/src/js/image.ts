import * as zstd from "@bokuweb/zstd-wasm";
import { type DDSImage, parseDDSDX10 } from "dds/src";

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
