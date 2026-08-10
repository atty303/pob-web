import { assertEquals } from "@std/assert";
import { ClipboardController, PasteBuffer, resolveClipboardShortcut } from "../../src/js/clipboard.ts";

Deno.test("ClipboardController reads and writes text", async () => {
  const writes: string[] = [];
  const controller = new ClipboardController({
    readText: () => Promise.resolve("pasted"),
    writeText: (text) => {
      writes.push(text);
      return Promise.resolve();
    },
  });

  assertEquals(await controller.readText(), "pasted");
  await controller.writeText("copied");
  assertEquals(writes, ["copied"]);
});

Deno.test("ClipboardController makes clipboard failures non-fatal", async () => {
  const warnings: Array<[string, unknown]> = [];
  const error = new DOMException("denied", "NotAllowedError");
  const controller = new ClipboardController(
    {
      readText: () => Promise.reject(error),
      writeText: () => Promise.reject(error),
    },
    (message, cause) => warnings.push([message, cause]),
  );

  assertEquals(await controller.readText(), undefined);
  await controller.writeText("ignored");
  assertEquals(warnings, [
    ["Clipboard read was denied", error],
    ["Clipboard write was denied", error],
  ]);
});

Deno.test("PasteBuffer preserves empty text and consumes values once", () => {
  const buffer = new PasteBuffer();
  buffer.push("");
  buffer.push("second");

  assertEquals(buffer.take(), "");
  assertEquals(buffer.take(), "second");
  assertEquals(buffer.take(), undefined);

  buffer.push("stale");
  buffer.clear();
  assertEquals(buffer.take(), undefined);
});

Deno.test("resolveClipboardShortcut accepts Ctrl and Cmd copy/paste keys", () => {
  assertEquals(resolveClipboardShortcut("c", true), "copy");
  assertEquals(resolveClipboardShortcut("V", true), "paste");
  assertEquals(resolveClipboardShortcut("c", false), undefined);
  assertEquals(resolveClipboardShortcut("x", true), undefined);
});
