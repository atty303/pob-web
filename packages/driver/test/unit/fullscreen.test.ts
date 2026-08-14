import { assertEquals } from "@std/assert";
import { toggleFullscreen } from "../../src/js/fullscreen.ts";

Deno.test("fullscreen capability absence is non-fatal", async () => {
  const warnings: Array<[string, unknown?]> = [];
  await toggleFullscreen(
    {} as HTMLElement,
    {} as Document,
    (message, error) => warnings.push([message, error]),
  );

  assertEquals(warnings, [["Fullscreen API not supported on this device", undefined]]);
});

Deno.test("fullscreen policy rejection is non-fatal", async () => {
  const error = new TypeError("Disallowed by permissions policy");
  const warnings: Array<[string, unknown?]> = [];
  await toggleFullscreen(
    { requestFullscreen: () => Promise.reject(error) } as HTMLElement,
    {} as Document,
    (message, cause) => warnings.push([message, cause]),
  );

  assertEquals(warnings, [["Fullscreen toggle failed", error]]);
});

Deno.test("fullscreen exit cancellation is non-fatal", async () => {
  const error = new TypeError("Pending operation cancelled by exitFullscreen() call.");
  const warnings: Array<[string, unknown?]> = [];
  await toggleFullscreen(
    {} as HTMLElement,
    {
      fullscreenElement: {} as Element,
      exitFullscreen: () => Promise.reject(error),
    } as Document,
    (message, cause) => warnings.push([message, cause]),
  );

  assertEquals(warnings, [["Fullscreen toggle failed", error]]);
});
