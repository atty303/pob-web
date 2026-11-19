import { assertEquals } from "@std/assert";
import { FrameDemand } from "../../src/js/frame-demand.ts";
import { InputFrameBoundary } from "../../src/js/input-frame.ts";

Deno.test("a burst of mouse motion requires one frame and stops when motion stops", () => {
  const demand = new FrameDemand();
  for (let move = 0; move < 100; move++) demand.request(1);
  assertEquals(demand.pending, 1);
  demand.consume();
  assertEquals(demand.pending, 0);
  demand.request(1); // Motion after that frame still gets another frame.
  assertEquals(demand.pending, 1);
});

Deno.test("ordinary invalidations and motion preserve an explicit asynchronous frame budget", () => {
  const demand = new FrameDemand();
  demand.request(12);
  demand.request(3); // Image completion, resize or discrete input invalidation.
  demand.request(1); // Mouse move.
  assertEquals(demand.pending, 12);
  let frames = 0;
  while (demand.pending > 0) {
    demand.consume();
    frames++;
  }
  assertEquals(frames, 12);
});

Deno.test("RequestFrames during rendering keeps all requested future frames", () => {
  const demand = new FrameDemand();
  demand.request(1);
  demand.consume(); // The frame is now running.
  demand.request(5); // Lua RequestFrames(5) from inside that frame.
  assertEquals(demand.pending, 5);
  demand.request(1); // Later input cannot shorten that budget.
  let futureFrames = 0;
  while (demand.pending > 0) {
    demand.consume();
    futureFrames++;
  }
  assertEquals(futureFrames, 5);
});

Deno.test("synchronous input flush preserves old cursor state and new frame requests", () => {
  const demand = new FrameDemand();
  let mouseX = 20;
  const observed: number[] = [];
  const input = new InputFrameBoundary(() => {
    demand.consume();
    observed.push(mouseX);
    demand.request(5);
  });
  input.markPending();
  demand.request(3);
  input.flush(); // Before changing the cursor, consume the queued click.
  mouseX = 80;
  demand.request(1);
  assertEquals(observed, [20]);
  assertEquals(demand.pending, 5);
  input.flush();
  assertEquals(observed, [20]);
});

Deno.test("clearing after a failed frame prevents retries until new demand arrives", () => {
  const demand = new FrameDemand();
  demand.request(8);
  demand.consume();
  demand.clear();
  assertEquals(demand.pending, 0);
  demand.request(1);
  demand.consume();
  demand.consume(); // An explicit input flush need not have a queued RAF budget.
  assertEquals(demand.pending, 0);
});
