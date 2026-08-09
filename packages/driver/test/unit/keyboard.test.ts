import assert from "node:assert/strict";
import test from "node:test";
import { type DOMKey, DOMKeyboardState, type PoBKey, PoBKeyboardState } from "../../src/js/keyboard";

type Event = { type: "down" | "up" | "char"; value: string };

function makeKeyboard() {
  const events: Event[] = [];
  const pob = PoBKeyboardState.make({
    onKeyDown: (_state, key) => events.push({ type: "down", value: key }),
    onKeyUp: (_state, key) => events.push({ type: "up", value: key }),
    onChar: (_state, char) => events.push({ type: "char", value: char }),
  });
  return { dom: DOMKeyboardState.make(pob), events, keys: pob.pobKeys };
}

test("DOM keys map to PoB keys and update held state", () => {
  const { dom, events, keys } = makeKeyboard();

  dom.keydown("ArrowLeft" as DOMKey);
  assert.equal(keys.has("LEFT" as PoBKey), true);
  dom.keyup("ArrowLeft" as DOMKey);

  assert.equal(keys.size, 0);
  assert.deepEqual(events, [
    { type: "down", value: "LEFT" },
    { type: "up", value: "LEFT" },
  ]);
});

test("special DOM keys emit their PoB character", () => {
  const { dom, events } = makeKeyboard();
  dom.keydown("Enter" as DOMKey);

  assert.deepEqual(events, [
    { type: "down", value: "RETURN" },
    { type: "char", value: "\r" },
  ]);
});

test("virtual Shift remains held and transforms characters", () => {
  const { dom, events } = makeKeyboard();

  assert.deepEqual([...dom.virtualKeyPress("Shift" as DOMKey, true)], ["Shift"]);
  dom.virtualKeyPress("a" as DOMKey, false);
  dom.virtualKeyPress("1" as DOMKey, false);
  assert.deepEqual([...dom.virtualKeyPress("Shift" as DOMKey, true)], []);

  assert.deepEqual(
    events.filter(event => event.type === "char"),
    [
      { type: "char", value: "A" },
      { type: "char", value: "!" },
    ],
  );
});
