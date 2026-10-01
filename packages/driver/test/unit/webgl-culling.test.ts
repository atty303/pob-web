import { assertEquals } from "@std/assert";
import type { TextureBitmap, TextureSource } from "../../src/js/image.ts";
import { InstanceBuffer } from "../../src/js/renderer/instance_buffer.ts";
import type { WebGL2Backend as Backend } from "../../src/js/renderer/webgl_backend.ts";

// The backend's module-level texture target table uses these browser constants.
Object.defineProperty(globalThis, "WebGL2RenderingContext", {
  configurable: true,
  value: { TEXTURE_2D: 0x0de1, TEXTURE_2D_ARRAY: 0x8c1a, TEXTURE_3D: 0x806f, TEXTURE_CUBE_MAP: 0x8513 },
});
const { WebGL2Backend } = await import("../../src/js/renderer/webgl_backend.ts");
Reflect.deleteProperty(globalThis, "WebGL2RenderingContext");

function makeBackend() {
  const calls = { textures: 0, binds: 0, updates: 0 };
  const instances = new InstanceBuffer();
  // Exercise the actual submission path without constructing a browser GL context.
  const backend = Object.assign(Object.create(WebGL2Backend.prototype), {
    viewport: [300, 50, 100, 100],
    viewportCullPadding: 2,
    instances,
    drawCount: 0,
    getTexture() {
      calls.textures++;
      return { target: 1, gl: {}, format: { external: 1, type: 1 } };
    },
    bindBatchTexture() {
      calls.binds++;
      return 0;
    },
    gl: {
      bindTexture() {},
      texSubImage3D() {
        calls.updates++;
      },
    },
  }) as Backend;
  return { backend, instances, calls };
}

function draw(backend: Backend, texture: TextureBitmap, x: number) {
  backend.drawQuad(
    x,
    10,
    x + 10,
    10,
    x + 10,
    20,
    x,
    20,
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    1,
    texture,
    0xffffffff,
    0,
    -1,
    false,
  );
}

Deno.test("culled static quads do not resolve textures, bind batches or submit instances", () => {
  const { backend, instances, calls } = makeBackend();
  const texture = { id: "static", source: {} as TextureSource };
  draw(backend, texture, -100);
  assertEquals(calls, { textures: 0, binds: 0, updates: 0 });
  assertEquals(instances.length, 0);
  draw(backend, texture, 10);
  assertEquals(calls, { textures: 1, binds: 1, updates: 0 });
  assertEquals(instances.length, 1);
});

Deno.test("offscreen dynamic textures retain their update and submission behavior", () => {
  const { backend, instances, calls } = makeBackend();
  let updates = 0;
  const texture: TextureBitmap = {
    id: "dynamic",
    source: {} as TextureSource,
    updateSubImage() {
      updates++;
      return { x: 0, y: 0, width: 1, height: 1, source: new Uint8Array(4) };
    },
  };
  draw(backend, texture, -100);
  assertEquals(updates, 1);
  assertEquals(calls, { textures: 1, binds: 1, updates: 1 });
  assertEquals(instances.length, 1);
});
