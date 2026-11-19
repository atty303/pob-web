import { assertEquals } from "@std/assert";
import { LatestValueDispatcher } from "../../src/js/latest-value-dispatcher.ts";
import { BackgroundPromiseOwner } from "../../src/js/promise-owner.ts";

function harness() {
  const sent: number[] = [];
  const releases: (() => void)[] = [];
  const moves = new LatestValueDispatcher<number>((value) => {
    sent.push(value);
    return new Promise<void>((resolve) => releases.push(resolve));
  });
  const release = async (index: number) => {
    releases[index]();
    await Promise.resolve();
  };
  return { moves, sent, release };
}

Deno.test("a busy worker receives only the latest pending position after a motion burst", async () => {
  const { moves, sent, release } = harness();
  for (let i = 0; i < 1000; i++) moves.push(i);
  assertEquals(sent, [0]);
  await release(0);
  assertEquals(sent, [0, 999]);
  moves.push(1000);
  moves.push(1001);
  await release(1);
  assertEquals(sent, [0, 999, 1001]);
  await release(2);
});

Deno.test("discrete barriers retain click/drag positions and later movement cannot pass them", async () => {
  const { moves, sent, release } = harness();
  moves.push(10);
  moves.push(20);
  moves.flushPending(); // Send cursor 20 immediately before button-down RPC.
  sent.push(-1); // Ordered button-down marker.
  moves.push(30);
  moves.push(40);
  moves.flushPending(); // Preserve release position even while older sends wait.
  sent.push(-2); // Ordered button-up marker.
  moves.push(50);
  moves.push(60);
  assertEquals(sent, [10, 20, -1, 40, -2]);
  await release(0);
  await release(1);
  assertEquals(sent, [10, 20, -1, 40, -2]);
  await release(2);
  assertEquals(sent, [10, 20, -1, 40, -2, 60]);
  await release(3);
});

Deno.test("export flush waits for the buffered position as well as an older send", async () => {
  const sent: number[] = [];
  const releases: (() => void)[] = [];
  const owner = new BackgroundPromiseOwner(() => {}, () => {});
  const moves = new LatestValueDispatcher<number>((value) =>
    owner.dispatch("mouse", () => {
      sent.push(value);
      return new Promise<void>((resolve) => releases.push(resolve));
    })
  );
  moves.push(1);
  moves.push(2);
  moves.push(3);
  moves.flushPending();
  let exported = false;
  const exportResult = owner.settled().then(() => {
    exported = true;
  });
  releases[0]();
  await Promise.resolve();
  assertEquals(exported, false);
  assertEquals(sent, [1, 3]);
  releases[1]();
  await exportResult;
  assertEquals(exported, true);
});

Deno.test("owned send failures release backpressure and are reported once", async () => {
  const failures: string[] = [];
  const owner = new BackgroundPromiseOwner(() => {}, (error) => failures.push(String(error)));
  const sent: number[] = [];
  const moves = new LatestValueDispatcher<number>((value) =>
    owner.dispatch("mouse", () => {
      sent.push(value);
      if (value === 1) throw new Error("send failed");
      return Promise.resolve();
    })
  );
  moves.push(1);
  moves.push(2);
  await owner.settled();
  await owner.settled();
  assertEquals(sent, [1, 2]);
  assertEquals(failures, ["Error: send failed"]);
});

Deno.test("detach discards buffered movement and destroy prevents late completion from sending", async () => {
  const { moves, sent, release } = harness();
  moves.push(1);
  moves.push(2);
  moves.discardPending();
  await release(0);
  assertEquals(sent, [1]);
  moves.push(3);
  moves.push(4);
  moves.close();
  moves.push(5);
  moves.flushPending();
  await release(1);
  assertEquals(sent, [1, 3]);
});
