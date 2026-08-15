import { assertEquals } from "@std/assert";
import { BackgroundPromiseOwner, enqueueOwnedAction, observeOwnedPromise } from "../../src/js/promise-owner.ts";

Deno.test("background rejection is diagnosed, reported once, and does not escape as unhandled", async () => {
  const diagnostics: Array<{ operation: string; error: unknown }> = [];
  const reports: unknown[] = [];
  const unhandled: unknown[] = [];
  const onUnhandled = (event: PromiseRejectionEvent) => unhandled.push(event.reason);
  globalThis.addEventListener("unhandledrejection", onUnhandled);

  try {
    const owner = new BackgroundPromiseOwner(
      (operation, error) => diagnostics.push({ operation, error }),
      (error) => reports.push(error),
    );
    owner.dispatch("resize", () => Promise.reject(new Error("first")));
    owner.dispatch("mouse", () => Promise.reject(new Error("second")));
    owner.dispatch("visibility", () => {
      throw new Error("third");
    });
    await owner.settled();
    await Promise.resolve();

    assertEquals(diagnostics.map(({ operation }) => operation), ["resize", "mouse", "visibility"]);
    assertEquals(reports.map(String), ["Error: first"]);
    assertEquals(unhandled, []);
  } finally {
    globalThis.removeEventListener("unhandledrejection", onUnhandled);
  }
});

Deno.test("background work observes mutable input at dispatch time", async () => {
  const snapshots: string[][] = [];
  const owner = new BackgroundPromiseOwner(() => {}, () => {});
  const keys = new Set(["A"]);

  owner.dispatch("keyboard-state", () => {
    snapshots.push([...keys]);
    return Promise.resolve();
  });
  keys.clear();

  assertEquals(snapshots, [["A"]]);
  await owner.settled();
});

Deno.test("owned clipboard queue recovers after a rejected action", async () => {
  const actions: string[] = [];
  let queue = Promise.resolve();
  queue = enqueueOwnedAction(queue, async () => {
    actions.push("first");
    throw new Error("clipboard rejected");
  });
  queue = enqueueOwnedAction(queue, async () => {
    actions.push("second");
  });

  await queue;
  assertEquals(actions, ["first", "second"]);
});

Deno.test("worker image load rejection reaches the managed observer without escaping globally", async () => {
  const managed: unknown[] = [];
  const unhandled: unknown[] = [];
  const onUnhandled = (event: PromiseRejectionEvent) => unhandled.push(event.reason);
  globalThis.addEventListener("unhandledrejection", onUnhandled);

  try {
    observeOwnedPromise(
      Promise.reject(new DOMException("image failed", "EncodingError")),
      () => {},
      (error) => managed.push(error),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(managed.map(String), ["EncodingError: image failed"]);
    assertEquals(unhandled, []);
  } finally {
    globalThis.removeEventListener("unhandledrejection", onUnhandled);
  }
});
