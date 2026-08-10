import assert from "node:assert/strict";
import test from "node:test";
import { headRelease, headReleases, resolveDriverReleases } from "../../../../tools/e2e-releases.ts";

test("driver E2E defaults to every game head", () => {
  assert.deepEqual(resolveDriverReleases({}).releases, headReleases);
});

test("a targeted game defaults to its head", () => {
  assert.deepEqual(resolveDriverReleases({ RUN_GAME: "poe2" }), {
    releases: [headRelease("poe2")],
    targeted: true,
  });
});

test("a targeted compatibility check preserves its explicit version", () => {
  assert.deepEqual(resolveDriverReleases({ RUN_GAME: "poe2", RUN_VERSION: "v-test" }), {
    releases: [{ game: "poe2", version: "v-test" }],
    targeted: true,
  });
});

test("a version without a game is rejected", () => {
  assert.throws(() => resolveDriverReleases({ RUN_VERSION: "v-test" }), /RUN_VERSION requires RUN_GAME/);
});
