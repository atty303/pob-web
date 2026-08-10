import { assertEquals } from "@std/assert";
import {
  environmentErrorCategory,
  environmentErrorNames,
  isEnvironmentError,
  isLocalUserStorageOperation,
  markEnvironmentError,
} from "../../src/js/error.ts";

Deno.test("environment errors retain their original details while carrying a Comlink-safe category", () => {
  const error = new Error("network unavailable");
  const originalStack = error.stack;

  const marked = markEnvironmentError(error, "assetLoad");

  assertEquals(marked, error);
  assertEquals(marked.message, "network unavailable");
  assertEquals(marked.stack, originalStack);
  assertEquals(marked.name, environmentErrorNames.assetLoad);
  assertEquals(environmentErrorCategory(marked), "assetLoad");
  assertEquals(isEnvironmentError(marked), true);
});

Deno.test("ordinary errors are not classified as expected environment failures", () => {
  const error = new Error("Lua failure");

  assertEquals(environmentErrorCategory(error), undefined);
  assertEquals(isEnvironmentError(error), false);
});

Deno.test("storage operation classification excludes root assets and cloud mounts", () => {
  const localFds = new Set([7]);
  const cloudDirectory = "/user/test/Builds/Cloud";

  assertEquals(isLocalUserStorageOperation("open", ["/user/test/Builds/local.xml"], localFds, cloudDirectory), true);
  assertEquals(isLocalUserStorageOperation("write", [7], localFds, cloudDirectory), true);
  assertEquals(isLocalUserStorageOperation("open", ["/root/TreeData/3_0"], localFds, cloudDirectory), false);
  assertEquals(
    isLocalUserStorageOperation("open", [`${cloudDirectory}/Public/build.xml`], localFds, cloudDirectory),
    false,
  );
});
