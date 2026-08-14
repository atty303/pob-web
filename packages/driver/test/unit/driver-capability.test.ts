import { assertEquals, assertThrows } from "@std/assert";
import { assertDriverCapabilities } from "../../src/js/capability.ts";
import { environmentErrorCategory } from "../../src/js/error.ts";

const supported = {
  crossOriginIsolated: true,
  SharedArrayBuffer,
  WebAssembly,
  OffscreenCanvas: class {},
};

Deno.test("driver accepts required browser capabilities", () => {
  assertEquals(assertDriverCapabilities(supported), undefined);
});

for (
  const [name, capabilities] of [
    ["WebAssembly", { ...supported, WebAssembly: undefined }],
    ["OffscreenCanvas", { ...supported, OffscreenCanvas: undefined }],
  ] as const
) {
  Deno.test(`driver classifies missing ${name} as an environment capability`, () => {
    const error = assertThrows(() => assertDriverCapabilities(capabilities));
    assertEquals(environmentErrorCategory(error), "capability");
  });
}
