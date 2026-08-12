import { assertEquals, assertRejects } from "@std/assert";
import { Format, Target, Texture } from "dds";
import { decode_bc7, initialize } from "texture2ddecoder-wasm";
import { bgraToRgba, decodeBc7Texture } from "../../src/js/bc7.ts";

Deno.test("the Wasm decoder produces the expected RGBA pixels for a BC7 block", async () => {
  await initialize();
  const bgra = await decode_bc7(
    new Uint8Array([16, 224, 131, 5, 20, 240, 3, 0, 0, 129, 1, 0, 160, 64, 14, 240]),
    4,
    4,
  );
  if (!bgra) throw new Error("BC7 fixture failed to decode");

  assertEquals(
    toHex(bgraToRgba(bgra)),
    "00000000000000000000000000000000000000000000000000000000000000b7" +
      "000000000000000000000024ab3c37ff000000000000000000000093ff5a52ff",
  );
});

Deno.test("BGRA decoder output is converted to RGBA", () => {
  assertEquals(bgraToRgba(new Uint8Array([3, 2, 1, 4, 7, 6, 5, 8])), new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
});

Deno.test("BC7 fallback preserves layers, faces, mip levels, and edge extents", async () => {
  const source = new Texture(Target.TARGET_2D_ARRAY, Format.RGBA_BP_UNORM_BLOCK16, [5, 3, 1], 2, 1, 3);
  source.data = new DataView(new ArrayBuffer(source.size));
  const calls: Array<[number, number, number]> = [];

  const decoded = await decodeBc7Texture(source, async (data, width, height) => {
    calls.push([data.byteLength, width, height]);
    return new Uint8Array(width * height * 4).fill(calls.length);
  });

  assertEquals(decoded.format, Format.RGBA8_UNORM_PACK8);
  assertEquals(decoded.target, source.target);
  assertEquals(decoded.extent, source.extent);
  assertEquals(decoded.layers, 2);
  assertEquals(decoded.levels, 3);
  assertEquals(calls, [
    [32, 5, 3],
    [16, 2, 1],
    [16, 1, 1],
    [32, 5, 3],
    [16, 2, 1],
    [16, 1, 1],
  ]);
  assertEquals(
    new Uint8Array(decoded.dataOf(1, 0, 0).buffer, decoded.dataOf(1, 0, 0).byteOffset, 4),
    new Uint8Array(4).fill(4),
  );
});

Deno.test("BC7 fallback rejects an invalid decoder result size", async () => {
  const source = new Texture(Target.TARGET_2D, Format.RGBA_BP_UNORM_BLOCK16, [4, 4, 1], 1, 1, 1);
  source.data = new DataView(new ArrayBuffer(source.size));
  await assertRejects(() => decodeBc7Texture(source, async () => new Uint8Array(1)), Error, "expected 64");
});

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}
