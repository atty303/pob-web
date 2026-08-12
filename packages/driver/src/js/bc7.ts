import { Format, Texture } from "dds";

export type Bc7BlockDecoder = (data: Uint8Array, width: number, height: number) => Promise<Uint8Array>;

type DecoderModule = {
  decode_bc7(data: Uint8Array, width: number, height: number): Uint8Array | null;
};

let decoderPromise: Promise<DecoderModule> | undefined;

export async function decodeBc7(data: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const decoder = await (decoderPromise ??= loadDecoder().catch((error) => {
    decoderPromise = undefined;
    throw error;
  }));
  const decoded = decoder.decode_bc7(data, width, height);
  if (!decoded) throw new Error(`BC7 decode failed for ${width}x${height} texture`);
  return bgraToRgba(decoded);
}

export async function decodeBc7Texture(
  source: Texture,
  decode: Bc7BlockDecoder = decodeBc7,
): Promise<Texture> {
  if (source.format !== Format.RGBA_BP_UNORM_BLOCK16) return source;

  const destination = new Texture(
    source.target,
    Format.RGBA8_UNORM_PACK8,
    source.extent,
    source.layers,
    source.faces,
    source.levels,
    source.swizzles,
  );
  const data = new Uint8Array(destination.size);
  destination.data = new DataView(data.buffer);

  for (let layer = 0; layer < source.layers; layer++) {
    for (let face = 0; face < source.faces; face++) {
      for (let level = 0; level < source.levels; level++) {
        const [width, height] = source.extentOf(level);
        const compressed = source.dataOf(layer, face, level);
        const decoded = await decode(
          new Uint8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength),
          width,
          height,
        );
        const destinationLevel = destination.dataOf(layer, face, level);
        if (decoded.byteLength !== destinationLevel.byteLength) {
          throw new Error(
            `BC7 decoder returned ${decoded.byteLength} bytes for ${width}x${height}; expected ${destinationLevel.byteLength}`,
          );
        }
        new Uint8Array(destinationLevel.buffer, destinationLevel.byteOffset, destinationLevel.byteLength).set(decoded);
      }
    }
  }

  return destination;
}

export function bgraToRgba(pixels: Uint8Array): Uint8Array {
  if (pixels.byteLength % 4 !== 0) throw new Error("Decoded BC7 pixels are not BGRA8");
  const rgba = pixels.slice();
  for (let offset = 0; offset < rgba.byteLength; offset += 4) {
    const blue = rgba[offset];
    rgba[offset] = rgba[offset + 2];
    rgba[offset + 2] = blue;
  }
  return rgba;
}

async function loadDecoder(): Promise<DecoderModule> {
  const moduleUrl = new URL("/texture2ddecoder/texture2ddecoder.js", globalThis.location.href);
  const { default: createModule } = await import(/* @vite-ignore */ moduleUrl.href) as {
    default: (options: { locateFile: (path: string) => string }) => Promise<DecoderModule>;
  };
  return await createModule({
    locateFile: (path) => new URL(path, moduleUrl).href,
  });
}
