import { assertEquals } from "@std/assert";
import { calculateRenderingSize, CanvasManager, MAX_RENDERING_DIMENSION } from "../../src/js/canvas-manager.ts";

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

Deno.test("rendering size preserves device pixel ratio within the backing-store limit", () => {
  assertEquals(calculateRenderingSize(1550, 800, 1), {
    styleWidth: 1550,
    styleHeight: 800,
    renderingWidth: 1550,
    renderingHeight: 800,
    pixelRatio: 1,
  });
  assertEquals(calculateRenderingSize(1550, 800, 2), {
    styleWidth: 1550,
    styleHeight: 800,
    renderingWidth: 3100,
    renderingHeight: 1600,
    pixelRatio: 2,
  });
});

Deno.test("rendering size caps high-DPI landscape and portrait canvases", () => {
  const landscape = calculateRenderingSize(1550, 800, 3);
  assertEquals(landscape, {
    styleWidth: 1550,
    styleHeight: 800,
    renderingWidth: MAX_RENDERING_DIMENSION,
    renderingHeight: 2114,
    pixelRatio: MAX_RENDERING_DIMENSION / 1550,
  });

  const portrait = calculateRenderingSize(800, 1550, 3);
  assertEquals(portrait, {
    styleWidth: 800,
    styleHeight: 1550,
    renderingWidth: 2114,
    renderingHeight: MAX_RENDERING_DIMENSION,
    pixelRatio: MAX_RENDERING_DIMENSION / 1550,
  });
});

Deno.test("rendering size caps rounded and oversized CSS dimensions", () => {
  const rounded = calculateRenderingSize(1365.5, 800.25, 3);
  assertEquals(rounded.renderingWidth, MAX_RENDERING_DIMENSION);
  assertEquals(rounded.renderingHeight, 2400);

  assertEquals(calculateRenderingSize(5000, 2500, 1), {
    styleWidth: 5000,
    styleHeight: 2500,
    renderingWidth: MAX_RENDERING_DIMENSION,
    renderingHeight: 2048,
    pixelRatio: MAX_RENDERING_DIMENSION / 5000,
  });
});
