import { assertEquals } from "@std/assert";
import { calculateRenderingSize, CanvasManager } from "../../src/js/canvas-manager.ts";

const makeCanvas = () => new CanvasManager({ minWidth: 800, minHeight: 600, toolbarSize: 60 });

Deno.test("canvas and screen coordinate transforms remain inverse", () => {
  const canvas = makeCanvas();
  canvas.zoom(1.5, 400, 300);
  canvas.pan(-20, -10);

  const screen = canvas.canvasToScreen(240, 160);
  const point = canvas.screenToCanvas(screen.x, screen.y);

  assertEquals(point, { x: 240, y: 160 });
});

Deno.test("zoom clamps at its supported limits", () => {
  const canvas = makeCanvas();

  canvas.zoom(100, 400, 300);
  assertEquals(canvas.transform.scale, 2);

  canvas.zoom(0.001, 400, 300);
  assertEquals(canvas.transform.scale, 0.1);
});

Deno.test("resetTransform restores the identity transform", () => {
  const canvas = makeCanvas();
  canvas.zoom(1.5, 400, 300);
  canvas.pan(-20, -10);

  canvas.resetTransform();

  assertEquals(canvas.transform, { scale: 1, translateX: 0, translateY: 0 });
  assertEquals(canvas.generateTransformCSS(), "translate(0px, 0px) scale(1)");
});

Deno.test("zoomTo applies an absolute scale when the canvas initially scales to fit", () => {
  const canvas = makeCanvas();
  Object.assign(canvas, { _initialScale: 0.8 });

  canvas.zoomTo(1.2, 400, 300);

  assertEquals(canvas.transform.scale, 1.2);
});

Deno.test("rendering size uses rounded device pixels independently of CSS zoom", () => {
  const canvas = makeCanvas();
  canvas.zoom(1.5, 400, 300);

  assertEquals(calculateRenderingSize(801, 601, 1.5), {
    styleWidth: 801,
    styleHeight: 601,
    renderingWidth: 1202,
    renderingHeight: 902,
    pixelRatio: 1.5,
  });
});
