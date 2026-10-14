import { assertEquals } from "@std/assert";
import { InputFrameBoundary } from "../../src/js/input-frame.ts";

Deno.test("rapid shortcut release preserves modifiers while Lua consumes queued input", () => {
  let held = new Set(["CTRL", "2"]);
  const observed: boolean[] = [];
  const queue = new InputFrameBoundary(() => observed.push(held.has("CTRL")));
  queue.markPending(); // Lua OnKeyDown queued Control+2.
  queue.flush(); // Before the worker replaces state with key-up state.
  held = new Set();
  queue.flush();
  assertEquals(observed, [true]);
});

Deno.test("queued click is consumed at its original cursor position before mouse motion", () => {
  let mouseX = 20;
  const clicks: number[] = [];
  const queue = new InputFrameBoundary(() => clicks.push(mouseX));
  queue.markPending();
  queue.flush();
  mouseX = 80;
  queue.flush(); // Mouse-only updates need no additional synchronous frame.
  assertEquals(clicks, [20]);
});

Deno.test("regular RAF clears pending input and export flush consumes only unprocessed input", () => {
  let frames = 0;
  const queue = new InputFrameBoundary(() => frames++);
  queue.markPending();
  queue.clear(); // Input already consumed by regular RAF.
  queue.flush();
  assertEquals(frames, 0);
  queue.markPending();
  queue.flush(); // Export happens before the next RAF.
  assertEquals(frames, 1);
});

function makeDragHarness() {
  let cursor = 20;
  let held = false;
  let origin: number | undefined;
  let dragging = false;
  let distance = 0;
  let clicks = 0;
  let frames = 0;
  const events: string[] = [];
  // Model the relevant PassiveTreeView ordering: process click events, clear
  // dragging when the button is no longer held, then apply the cursor delta.
  const render = () => {
    frames++;
    for (const event of events) {
      if (event === "down") origin = cursor;
      if (event === "up" && origin !== undefined && !dragging) clicks++;
    }
    events.length = 0;
    if (!held) {
      dragging = false;
      origin = undefined;
    }
    if (origin !== undefined) {
      if (Math.abs(cursor - origin) > 5) dragging = true;
      if (dragging) {
        distance += cursor - origin;
        origin = cursor;
      }
    }
    input.clear();
  };
  const input = new InputFrameBoundary(render);
  return {
    down() {
      input.flush();
      held = true;
      events.push("down");
      input.markPending();
    },
    move(x: number) {
      input.flush();
      if (cursor !== x) input.markMotion();
      cursor = x;
    },
    up() {
      input.flush();
      if (held) input.flushMotion();
      held = false;
      events.push("up");
      input.markPending();
    },
    render,
    get result() {
      return { distance, clicks, frames };
    },
  };
}

Deno.test("down move up before any RAF applies the whole drag instead of clicking", () => {
  const drag = makeDragHarness();
  drag.down();
  drag.move(80);
  drag.up();
  drag.render();
  assertEquals(drag.result, { distance: 60, clicks: 0, frames: 3 });
});

Deno.test("release applies the final coalesced position after an already drawn drag", () => {
  const drag = makeDragHarness();
  drag.down();
  drag.render();
  drag.move(50);
  drag.render();
  drag.move(60);
  drag.move(70);
  drag.move(80);
  assertEquals(drag.result, { distance: 30, clicks: 0, frames: 2 });
  drag.up();
  drag.render();
  assertEquals(drag.result, { distance: 60, clicks: 0, frames: 4 });
});

Deno.test("a normal click retains click behavior without an extra motion frame", () => {
  const drag = makeDragHarness();
  drag.down();
  drag.move(20);
  drag.up();
  drag.render();
  assertEquals(drag.result, { distance: 0, clicks: 1, frames: 2 });
});

Deno.test("a rendered final drag position is not redundantly flushed on release", () => {
  const drag = makeDragHarness();
  drag.down();
  drag.render();
  drag.move(80);
  drag.render();
  const beforeRelease = drag.result.frames;
  drag.up();
  assertEquals(drag.result.frames, beforeRelease);
});
