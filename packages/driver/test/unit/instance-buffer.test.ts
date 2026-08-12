import { assertAlmostEquals, assertEquals } from "@std/assert";
import { INSTANCE_STRIDE, InstanceBuffer } from "../../src/js/renderer/instance_buffer.ts";

Deno.test("quad instances preserve geometry, texture metadata, viewport, and packed color", () => {
  const instances = new InstanceBuffer();
  const coords = [1, 2, 3, 4, 5, 6, 7, 8];
  const texCoords = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  instances.pushQuad(
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    0.1,
    0.2,
    0.3,
    0.4,
    0.5,
    0.6,
    0.7,
    0.8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    true,
    0xff8000ff,
  );

  assertEquals(INSTANCE_STRIDE, 100);
  assertEquals(instances.length, 1);
  assertEquals(instances.data.byteLength, INSTANCE_STRIDE);
  const floats = new Float32Array(instances.data.buffer, instances.data.byteOffset, 24);
  assertEquals([...floats.slice(0, 8)], coords);
  texCoords.forEach((value, index) => assertAlmostEquals(floats[8 + index], value));
  assertEquals([...floats.slice(16, 24)], [9, 10, 11, 12, 13, 14, 15, 1]);
  assertEquals(new DataView(instances.data.buffer, instances.data.byteOffset).getUint32(96, true), 0xff8000ff);
});

Deno.test("quad instance storage grows and resets without retaining submitted instances", () => {
  const instances = new InstanceBuffer();
  for (let index = 0; index < 2048; index++) {
    instances.pushQuad(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, false, 0);
  }
  assertEquals(instances.data.byteLength, 2048 * INSTANCE_STRIDE);
  instances.reset();
  assertEquals(instances.length, 0);
  assertEquals(instances.data.byteLength, 0);
});
