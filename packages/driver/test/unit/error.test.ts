import assert from "node:assert/strict";
import test from "node:test";
import {
  environmentErrorCategory,
  environmentErrorNames,
  isEnvironmentError,
  isLocalUserStorageOperation,
  markEnvironmentError,
} from "../../src/js/error";

test("environment errors retain their original details while carrying a Comlink-safe category", () => {
  const error = new Error("network unavailable");
  const originalStack = error.stack;

  const marked = markEnvironmentError(error, "assetLoad");

  assert.equal(marked, error);
  assert.equal(marked.message, "network unavailable");
  assert.equal(marked.stack, originalStack);
  assert.equal(marked.name, environmentErrorNames.assetLoad);
  assert.equal(environmentErrorCategory(marked), "assetLoad");
  assert.equal(isEnvironmentError(marked), true);
});

test("ordinary errors are not classified as expected environment failures", () => {
  const error = new Error("Lua failure");

  assert.equal(environmentErrorCategory(error), undefined);
  assert.equal(isEnvironmentError(error), false);
});

test("storage operation classification excludes root assets and cloud mounts", () => {
  const localFds = new Set([7]);
  const cloudDirectory = "/user/test/Builds/Cloud";

  assert.equal(isLocalUserStorageOperation("open", ["/user/test/Builds/local.xml"], localFds, cloudDirectory), true);
  assert.equal(isLocalUserStorageOperation("write", [7], localFds, cloudDirectory), true);
  assert.equal(isLocalUserStorageOperation("open", ["/root/TreeData/3_0"], localFds, cloudDirectory), false);
  assert.equal(
    isLocalUserStorageOperation("open", [`${cloudDirectory}/Public/build.xml`], localFds, cloudDirectory),
    false,
  );
});
