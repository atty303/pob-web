import { assertEquals } from "@std/assert";
import { registerSentryWasm } from "../../src/js/sentry-wasm.ts";

Deno.test("streaming and buffer instantiation both retain Wasm debug identity", async () => {
  const original = WebAssembly.instantiate, streaming = WebAssembly.instantiateStreaming;
  const messages: unknown[] = [];
  // Empty valid module plus a build_id custom section containing 01 02.
  const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 0, 11, 8, 98, 117, 105, 108, 100, 95, 105, 100, 1, 2]);
  try {
    registerSentryWasm({
      postMessage(message) {
        messages.push(message);
      },
    })("http://localhost/driver.wasm");
    await WebAssembly.instantiate(bytes);
    await WebAssembly.instantiateStreaming(new Response(bytes, { headers: { "Content-Type": "application/wasm" } }));
    assertEquals(messages.length, 2);
    assertEquals(messages[0], messages[1]);
    assertEquals((messages[0] as { _sentryWasmImages: { code_id: string }[] })._sentryWasmImages[0].code_id, "0102");
  } finally {
    WebAssembly.instantiate = original;
    WebAssembly.instantiateStreaming = streaming;
  }
});
