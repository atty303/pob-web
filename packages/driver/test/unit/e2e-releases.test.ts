import { assertEquals, assertThrows } from "@std/assert";
import { headRelease, headReleases, resolveDriverReleases } from "../../../../tools/e2e-releases.mts";

Deno.test("driver E2E defaults to every game head", () => {
  assertEquals(resolveDriverReleases({}).releases, headReleases);
});

Deno.test("a targeted game defaults to its head", () => {
  assertEquals(resolveDriverReleases({ RUN_GAME: "poe2" }), {
    releases: [headRelease("poe2")],
    targeted: true,
  });
});

Deno.test("a targeted compatibility check preserves its explicit version", () => {
  assertEquals(resolveDriverReleases({ RUN_GAME: "poe2", RUN_VERSION: "v-test" }), {
    releases: [{ game: "poe2", version: "v-test" }],
    targeted: true,
  });
});

Deno.test("a version without a game is rejected", () => {
  assertThrows(() => resolveDriverReleases({ RUN_VERSION: "v-test" }), Error, "RUN_VERSION requires RUN_GAME");
});
