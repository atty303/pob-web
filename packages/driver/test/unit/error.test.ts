import { assertEquals } from "@std/assert";
import {
  environmentErrorCategory,
  environmentErrorNames,
  isEnvironmentError,
  isKnownUpstreamError,
  isLocalUserStorageOperation,
  markEnvironmentError,
  markKnownUpstreamError,
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

Deno.test("known upstream Lua failures are classified without matching other Lua errors", () => {
  const upstream = markKnownUpstreamError(
    new Error(
      "Error in lua: In download callback: Classes/PoEAPI.lua:188: " +
        "attempt to index local 'response' (a nil value)",
    ),
  );
  const other = markKnownUpstreamError(new Error("Error in lua: Classes/PoEAPI.lua:188: another failure"));

  assertEquals(isKnownUpstreamError(upstream), true);
  assertEquals(
    isKnownUpstreamError(
      new Error(
        "Error in lua: In download callback: Classes/PoEAPI.lua:188: " +
          "attempt to index local 'response' (a nil value)",
      ),
    ),
    true,
  );
  assertEquals(isKnownUpstreamError(other), false);
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
