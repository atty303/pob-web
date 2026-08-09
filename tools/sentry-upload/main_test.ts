import { assertEquals } from "@std/assert";
import { wasmDebugUploadArgs } from "./main.ts";

Deno.test("Wasm debug information uses the native debug file upload", () => {
  assertEquals(wasmDebugUploadArgs("driver.debug.wasm"), [
    "debug-files",
    "upload",
    "--org",
    "atty303",
    "--project",
    "pob-web",
    "--type",
    "wasm",
    "--include-sources",
    "--wait",
    "driver.debug.wasm",
  ]);
});
