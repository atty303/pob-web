import { assertEquals } from "@std/assert";
import {
  cloneableError,
  environmentErrorCategory,
  environmentErrorNames,
  isEnvironmentError,
  isKnownUpstreamError,
  isLocalUserStorageOperation,
  markEnvironmentError,
  markKnownUpstreamError,
} from "../../src/js/error.ts";

Deno.test("worker errors are converted from uncloneable proxies", () => {
  const proxy = new Proxy({ message: "Wasm failure" }, {});
  const error = cloneableError(proxy);

  assertEquals(error.message, "[object Object]");
  assertEquals(structuredClone(error).message, "[object Object]");
});

Deno.test("environment errors retain their original details while carrying a Comlink-safe category", () => {
  const error = new Error("network unavailable");
  const originalStack = error.stack;

  const marked = markEnvironmentError(error, "assetLoad");

  assertEquals(marked === error, false);
  assertEquals(marked.message, "network unavailable");
  assertEquals(marked.stack, originalStack);
  assertEquals(marked.cause, error);
  assertEquals(marked.name, environmentErrorNames.assetLoad);
  assertEquals(environmentErrorCategory(marked), "assetLoad");
  assertEquals(isEnvironmentError(marked), true);
});

Deno.test("readonly browser errors can be marked as environment failures", () => {
  const error = new Error("OPFS initialization failed");
  Object.defineProperty(error, "name", { value: "InvalidStateError", writable: false });
  const originalStack = error.stack;

  const marked = markEnvironmentError(error, "storage");

  assertEquals(marked.message, error.message);
  assertEquals(marked.stack, originalStack);
  assertEquals(marked.cause, error);
  assertEquals(environmentErrorCategory(marked), "storage");
  const cloned = structuredClone(marked);
  assertEquals(cloned.message, error.message);
  assertEquals((cloned.cause as Error).message, error.message);
});

Deno.test("virtual asset address-family failures are classified without hiding other Lua failures", () => {
  const addressFamilyFailure = new Error(
    "Error in lua: In 'Init': [string \"-- pob-web: Path of Building Web...\"]:95: " +
      "LoadModule() error loading 'Classes/ModList.lua': cannot read Classes/ModList.lua: " +
      "Address family not supported by protocol\n" +
      "stack traceback:\n\t[C]: in function 'error'\n\tModules/Common.lua:71: in function 'getClass'",
  );
  const followedByAnotherFailure = new Error(
    "Error in lua: LoadModule() error loading 'Classes/ModList.lua': cannot read Classes/ModList.lua: " +
      "Address family not supported by protocol\n" +
      "Modules/Build.lua:1193: attempt to index field 'calcsTab'",
  );
  const missingAsset = new Error(
    "Error in lua: LoadModule() error loading 'Classes/Tooltip.lua': " +
      "cannot open Classes/Tooltip.lua: No such file or directory",
  );
  const arbitraryLuaFailure = new Error("Error in lua: Modules/Build.lua:1193: attempt to index field 'calcsTab'");
  const buildParseFailure = new Error(
    "Error in lua: Error parsing 'Unnamed build': 'PathOfBuilding' root element missing",
  );

  assertEquals(environmentErrorCategory(addressFamilyFailure), "assetLoad");
  assertEquals(environmentErrorCategory(followedByAnotherFailure), undefined);
  assertEquals(environmentErrorCategory(missingAsset), undefined);
  assertEquals(environmentErrorCategory(arbitraryLuaFailure), undefined);
  assertEquals(environmentErrorCategory(buildParseFailure), undefined);
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
