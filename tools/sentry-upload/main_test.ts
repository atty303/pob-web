import { assertEquals, assertRejects } from "@std/assert";
import { isTransientSentryCliFailure, retrySentryUpload, wasmDebugUploadArgs } from "./main.ts";

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

Deno.test("Sentry uploads retry a transient failure", async () => {
  let calls = 0;
  const delays: number[] = [];

  const result = await retrySentryUpload(
    "source map upload",
    () => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("connection reset"));
      return Promise.resolve("uploaded");
    },
    (error) => error instanceof Error && isTransientSentryCliFailure(error.message),
    3,
    (delay) => {
      delays.push(delay);
      return Promise.resolve();
    },
  );

  assertEquals(result, "uploaded");
  assertEquals(calls, 3);
  assertEquals(delays, [1_000, 2_000]);
});

Deno.test("Sentry uploads do not retry permanent failures", async () => {
  let calls = 0;
  const delays: number[] = [];

  await assertRejects(
    () =>
      retrySentryUpload(
        "Wasm debug upload",
        () => {
          calls++;
          return Promise.reject(new Error("authentication failed"));
        },
        (error) => error instanceof Error && isTransientSentryCliFailure(error.message),
        3,
        (delay) => {
          delays.push(delay);
          return Promise.resolve();
        },
      ),
    Error,
    "authentication failed",
  );

  assertEquals(calls, 1);
  assertEquals(delays, []);
});

Deno.test("Sentry CLI transport failure detection matches the deployment error", () => {
  assertEquals(isTransientSentryCliFailure("OpenSSL SSL_read: unexpected eof while reading"), true);
  assertEquals(isTransientSentryCliFailure("authentication failed"), false);
});
