import * as zstd from "@bokuweb/zstd-wasm";
import { Target, type Texture, parseDDSDX10 } from "dds/src";
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
      texture: ImageBitmap | ImageData | OffscreenCanvas;
    }
  | {
      type: "Texture";
      texture: Texture;
    }
);

export namespace TextureSource {
  export function newImage(texture: ImageBitmap | ImageData | OffscreenCanvas, flags: number): TextureSource {
    return {
      flags,
      target: Target.TARGET_2D_ARRAY,
      format: Format.RGBA8_UNORM_PACK8,
      width: texture.width,
      height: texture.height,
      layers: 1,
      levels: 1,
      type: "Image",
      texture,
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
          const texture = parseDDSDX10(data);
          holder.textureSource = TextureSource.newTexture(texture, flags);
        } catch (e) {
          log.warn(tag.texture, `Failed to load DDS: src=${src}`, e);
        }
      } else {
        holder.textureSource = TextureSource.newImage(await createImageBitmap(blob), flags);
      }
    }
  }

  get(handle: number): TextureSource | undefined {
    return this.images.get(handle)?.textureSource;
  }
}
