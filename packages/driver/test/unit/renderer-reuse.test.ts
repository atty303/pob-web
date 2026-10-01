import { assertEquals } from "@std/assert";
import type { ImageRepository, TextureBitmap } from "../../src/js/image.ts";
import type { RenderBackend } from "../../src/js/renderer/backend.ts";
import { Renderer } from "../../src/js/renderer/renderer.ts";
import type { TextMetrics } from "../../src/js/renderer/text.ts";

function fixture(run: (renderer: Renderer, images: Map<number, TextureBitmap>, calls: { frames: number }) => void) {
  const original = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class {
    getContext() {
      return {};
    }
  } as unknown as typeof OffscreenCanvas;
  const images = new Map<number, TextureBitmap>();
  const calls = { frames: 0 };
  const backend = {
    beginFrame: () => calls.frames++,
    begin() {},
    end() {},
    resize() {},
    drawQuad() {},
    getStats: () => ({ name: "WebGL2", instances: 1, instanceBytes: 84, dispatches: 1 }),
  } as unknown as RenderBackend;
  try {
    const renderer = new Renderer(
      { get: (handle: number) => images.get(handle) } as ImageRepository,
      {} as TextMetrics,
      { width: 100, height: 100 },
    );
    renderer.backend = backend;
    run(renderer, images, calls);
  } finally {
    globalThis.OffscreenCanvas = original;
  }
}

function drawImage(handle: number) {
  const view = new DataView(new ArrayBuffer(45));
  view.setUint8(0, 6);
  view.setInt32(1, handle, true);
  [0, 0, 10, 10, 0, 0, 1, 1].forEach((n, i) => view.setFloat32(5 + i * 4, n, true));
  view.setInt32(37, 0, true);
  view.setInt32(41, -1, true);
  return view;
}

Deno.test("identical commands reuse output; resources, resize, layers and context invalidate it", () => {
  fixture((renderer, images, calls) => {
    const view = drawImage(1);
    renderer.render(view);
    renderer.render(view);
    assertEquals(calls.frames, 1);
    assertEquals(renderer.getStats().reused, true);
    assertEquals(renderer.getStats().backend.instances, 0);
    images.set(1, { id: "loaded", source: {} } as TextureBitmap);
    renderer.render(view);
    assertEquals(calls.frames, 2);
    renderer.render(view);
    assertEquals(calls.frames, 2);
    images.set(1, { id: "replacement", source: {} } as TextureBitmap);
    renderer.render(view);
    assertEquals(calls.frames, 3);
    renderer.resize({ width: 100, height: 100, pixelRatio: 2 });
    renderer.render(view);
    assertEquals(calls.frames, 4);
    renderer.setLayerVisible(0, 0, false);
    renderer.render(view);
    assertEquals(calls.frames, 5);
    renderer.invalidateReuse();
    renderer.render(view);
    assertEquals(calls.frames, 6);
    view.setFloat32(5, 1, true);
    renderer.render(view);
    assertEquals(calls.frames, 7);
  });
});

Deno.test("dynamic texture frames always execute their original submission path", () => {
  fixture((renderer, images, calls) => {
    images.set(1, { id: "dynamic", source: {}, updateSubImage() {} } as unknown as TextureBitmap);
    const view = drawImage(1);
    renderer.render(view);
    renderer.render(view);
    assertEquals(calls.frames, 2);
    assertEquals(renderer.getStats().reused, false);
  });
});
