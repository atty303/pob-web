import * as zstd from "@bokuweb/zstd-wasm";
import { Target, Texture, parseDDSDX10 } from "dds/src";
import { Format } from "dds/src/format.ts";
import { log, tag } from "./logger.ts";

export type TextureSource = {
  flags: number;
  target: Target;
  format: Format;
  width: number;
  height: number;
  layers: number;
  levels: number;
} & (
  | {
      type: "Image";
      texture: (ImageBitmap | OffscreenCanvas | ImageData)[];
    }
  | {
      type: "Texture";
      texture: Texture;
    }
);

export namespace TextureSource {
  export function newImage(texture: ImageBitmap | OffscreenCanvas | ImageData, flags: number): TextureSource {
    return {
      flags,
      target: Target.TARGET_2D_ARRAY,
      format: Format.RGBA8_UNORM_PACK8,
      width: texture.width,
      height: texture.height,
      layers: 1,
      levels: 1,
      type: "Image",
      texture: [texture],
    };
  }

  export function newTexture(texture: Texture, flags: number): TextureSource {
    return {
      flags,
      target: texture.target,
      format: texture.format,
      width: texture.extent[0],
      height: texture.extent[1],
      layers: texture.layers,
      levels: texture.levels,
      type: "Texture",
      texture,
    };
  }
}

type TextureHolder = {
  flags: number;
  textureSource: TextureSource | undefined;
};

export enum TextureFlags {
  TF_CLAMP = 1,
  TF_NOMIPMAP = 2,
  TF_NEAREST = 4,
}

let zstdInitialized = false;

export class ImageRepository {
  private readonly prefix: string;
  private images: Map<number, TextureHolder> = new Map();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  async load(handle: number, src: string, flags: number): Promise<void> {
    if (this.images.has(handle)) return;

    const type = src.endsWith(".dds.zst") ? "Texture" : "Image";
    const holder: TextureHolder = {
      flags,
      textureSource: undefined,
    };
    this.images.set(handle, holder);

    const r = await fetch(this.prefix + src, { referrerPolicy: "no-referrer" });
    if (r.ok) {
      const blob = await r.blob();
      if (type === "Texture") {
        if (!zstdInitialized) {
          await zstd.init();
          zstdInitialized = true;
        }
        const data = zstd.decompress(new Uint8Array(await blob.arrayBuffer()));
        log.debug(tag.texture, "Loading DDS", src);
        try {
          const texture0 = parseDDSDX10(data);
          const texture = new Texture(
            Target.TARGET_2D_ARRAY,
            texture0.format,
            texture0.extent,
            texture0.layers,
            texture0.faces,
            texture0.levels,
          );
          texture.data = texture0.data;
          holder.textureSource = TextureSource.newTexture(texture, flags);
        } catch (e) {
          log.warn(tag.texture, `Failed to load DDS: src=${src}`, e);
        }
      } else {
        const image = await createImageBitmap(blob);
        if (flags & TextureFlags.TF_NOMIPMAP) {
          holder.textureSource = TextureSource.newImage(image, flags);
        } else {
          const { levels, mipmaps } = generateMipMap(image);
          holder.textureSource = {
            flags,
            target: Target.TARGET_2D_ARRAY,
            format: Format.RGBA8_UNORM_PACK8,
            width: image.width,
            height: image.height,
            layers: 1,
            levels,
            type: "Image",
            texture: mipmaps,
          };
        }
      }
    }
  }

  get(handle: number): TextureSource | undefined {
    return this.images.get(handle)?.textureSource;
  }
}

function generateMipMap(image: ImageBitmap) {
  const levels = Math.floor(Math.log2(Math.max(image.width, image.height))) + 1;

  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Failed to get 2D context");

  let width = image.width;
  let height = image.height;
  const mipmaps: ImageData[] = [];

  for (let i = 0; i < levels; i++) {
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
    const next = context.getImageData(0, 0, width, height);
    mipmaps.push(next);
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
  }

  return {
    levels,
    mipmaps,
  };
}
