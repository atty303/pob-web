import { assertEquals } from "@std/assert";
import { quadOutsideViewport } from "../../src/js/renderer/quad_visibility.ts";

Deno.test("rejects quads wholly outside each viewport edge", () => {
  assertEquals(quadOutsideViewport(100, 100, 1, -20, 10, -10, 10, -10, 20, -20, 20), true);
  assertEquals(quadOutsideViewport(100, 100, 1, 110, 10, 120, 10, 120, 20, 110, 20), true);
  assertEquals(quadOutsideViewport(100, 100, 1, 10, -20, 20, -20, 20, -10, 10, -10), true);
  assertEquals(quadOutsideViewport(100, 100, 1, 10, 110, 20, 110, 20, 120, 10, 120), true);
});

Deno.test("retains partially visible, rotated, mirrored and enclosing quads", () => {
  assertEquals(quadOutsideViewport(100, 100, 1, -10, 10, 10, 10, 10, 20, -10, 20), false);
  assertEquals(quadOutsideViewport(100, 100, 1, 50, -20, 120, 50, 50, 120, -20, 50), false);
  assertEquals(quadOutsideViewport(100, 100, 1, 20, 20, 10, 20, 10, 10, 20, 10), false);
  assertEquals(quadOutsideViewport(100, 100, 1, -20, -20, 120, -20, 120, 120, -20, 120), false);
});

Deno.test("preserves viewport boundary guard and Float32 rounding", () => {
  assertEquals(quadOutsideViewport(100, 100, 1, 101, 10, 110, 10, 110, 20, 101, 20), false);
  // This JS coordinate exceeds the guard, but its submitted Float32 value does not.
  const roundsTo101 = 101 + 1e-7;
  assertEquals(quadOutsideViewport(100, 100, 1, roundsTo101, 10, 110, 10, 110, 20, roundsTo101, 20), false);
  assertEquals(quadOutsideViewport(100, 100, 1, -10, 10, -1, 10, -1, 20, -10, 20), false);
});

Deno.test("leaves non-finite geometry and invalid viewports to existing renderer behavior", () => {
  assertEquals(quadOutsideViewport(100, 100, 1, NaN, -20, 20, -20, 20, -10, 10, -10), false);
  assertEquals(quadOutsideViewport(100, 100, 1, Infinity, -20, 20, -20, 20, -10, 10, -10), false);
  assertEquals(quadOutsideViewport(-1, 100, 1, 110, 10, 120, 10, 120, 20, 110, 20), false);
});
