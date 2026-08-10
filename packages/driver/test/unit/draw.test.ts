import { assertEquals, assertThrows } from "@std/assert";
import { DrawCommandInterpreter } from "../../src/js/draw.ts";

const setLayer = (layer: number, sublayer: number) => {
  const bytes = new Uint8Array(5);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, 2);
  view.setInt16(1, layer, true);
  view.setInt16(3, sublayer, true);
  return bytes;
};

const setViewport = (x: number, y: number, width: number, height: number) => {
  const bytes = new Uint8Array(17);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, 3);
  [x, y, width, height].forEach((value, index) => view.setInt32(1 + index * 4, value, true));
  return bytes;
};

const setColor = (r: number, g: number, b: number, a: number) => new Uint8Array([4, r, g, b, a]);

const variableCommand = (type: 5 | 8, text: string) => {
  const encoded = new TextEncoder().encode(text);
  const headerLength = type === 5 ? 3 : 14;
  const bytes = new Uint8Array(headerLength + encoded.length);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, type);
  view.setUint16(type === 5 ? 1 : 12, encoded.length, true);
  bytes.set(encoded, headerLength);
  return bytes;
};

const join = (...commands: Uint8Array[]) => {
  const bytes = new Uint8Array(commands.reduce((length, command) => length + command.length, 0));
  let offset = 0;
  for (const command of commands) {
    bytes.set(command, offset);
    offset += command.length;
  }
  return new DataView(bytes.buffer);
};

Deno.test("sort orders layers and replays the current viewport on a new layer", () => {
  const view = join(
    setViewport(1, 2, 800, 600),
    setViewport(9, 10, 1024, 768),
    setLayer(2, 0),
    setColor(1, 2, 3, 4),
    setLayer(1, 0),
  );

  const layers = DrawCommandInterpreter.sort(view);

  assertEquals(
    layers.map(layer => [layer.layer, layer.sublayer]),
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  );
  assertEquals(layers[1].ranges[0].length, 17);
  assertEquals(
    layers[2].ranges.map(range => range.length),
    [17, 5],
  );

  const replayedViewports: number[][] = [];
  DrawCommandInterpreter.runRange(layers[1].ranges[0], view, {
    onSetViewport: (x, y, width, height) => replayedViewports.push([x, y, width, height]),
    onSetColor: () => {},
    onSetColorEscape: () => {},
    onDrawImage: () => {},
    onDrawImageQuad: () => {},
    onDrawString: () => {},
  });
  assertEquals(replayedViewports, [[9, 10, 1024, 768]]);
});

Deno.test("runRange decodes variable-length color escape and string commands", () => {
  const view = join(variableCommand(5, "^x"), variableCommand(8, "hello"));
  const events: string[] = [];

  DrawCommandInterpreter.runRange({ offset: 0, length: view.byteLength }, view, {
    onSetViewport: () => {},
    onSetColor: () => {},
    onSetColorEscape: text => events.push(`escape:${text}`),
    onDrawImage: () => {},
    onDrawImageQuad: () => {},
    onDrawString: (_x, _y, _align, _height, _font, text) => events.push(`string:${text}`),
  });

  assertEquals(events, ["escape:^x", "string:hello"]);
});

Deno.test("sort rejects unknown commands", () => {
  assertThrows(
    () => DrawCommandInterpreter.sort(new DataView(new Uint8Array([255]).buffer)),
    Error,
    "Unknown command type: 255",
  );
});
