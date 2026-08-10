import assert from "node:assert/strict";
import test from "node:test";
import { CanvasManager } from "../../src/js/canvas-manager";

const makeCanvas = () => new CanvasManager({ minWidth: 800, minHeight: 600, toolbarSize: 60 });

test("canvas and screen coordinate transforms remain inverse", () => {
  const canvas = makeCanvas();
  canvas.zoom(1.5, 400, 300);
  canvas.pan(-20, -10);

  const screen = canvas.canvasToScreen(240, 160);
  const point = canvas.screenToCanvas(screen.x, screen.y);

  assert.deepEqual(point, { x: 240, y: 160 });
});

test("zoom clamps at its supported limits", () => {
  const canvas = makeCanvas();

  canvas.zoom(100, 400, 300);
  assert.equal(canvas.transform.scale, 2);

  canvas.zoom(0.001, 400, 300);
  assert.equal(canvas.transform.scale, 0.1);
});

test("resetTransform restores the identity transform", () => {
  const canvas = makeCanvas();
  canvas.zoom(1.5, 400, 300);
  canvas.pan(-20, -10);

  canvas.resetTransform();

  assert.deepEqual(canvas.transform, { scale: 1, translateX: 0, translateY: 0 });
  assert.equal(canvas.generateTransformCSS(), "translate(0px, 0px) scale(1)");
});

test("zoomTo applies an absolute scale when the canvas initially scales to fit", () => {
  const canvas = makeCanvas();
  Object.assign(canvas, { _initialScale: 0.8 });

  canvas.zoomTo(1.2, 400, 300);

  assert.equal(canvas.transform.scale, 1.2);
});
