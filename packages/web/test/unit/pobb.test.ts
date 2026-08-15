import { assertEquals, assertRejects } from "@std/assert";
import { loadPobbBuild, parsePobbBuild, pobbJsonUrl } from "../../src/lib/pobb.ts";

Deno.test("POBb.in short links resolve to their JSON endpoint", () => {
  assertEquals(pobbJsonUrl("https://pobb.in/abcde_123"), "https://pobb.in/abcde_123/json");
  assertEquals(pobbJsonUrl("https://pobb.in/pob/abcde"), undefined);
  assertEquals(pobbJsonUrl("https://pobb.in/abcde?source=share"), undefined);
  assertEquals(pobbJsonUrl("https://pobb.in/abcde#fragment"), undefined);
  assertEquals(pobbJsonUrl("https://example.com/abcde"), undefined);
  assertEquals(pobbJsonUrl("not a URL"), undefined);
});

Deno.test("POBb.in build responses map supported game versions", () => {
  assertEquals(parsePobbBuild({ content: "build-code", metadata: { game_version: "One" } }), {
    content: "build-code",
    game: "poe1",
  });
  assertEquals(parsePobbBuild({ content: "build-code", metadata: { game_version: "Two" } }), {
    content: "build-code",
    game: "poe2",
  });
  assertEquals(parsePobbBuild({ content: "", metadata: { game_version: "One" } }), undefined);
  assertEquals(parsePobbBuild({ content: "build-code", metadata: { game_version: "Unknown" } }), undefined);
});

Deno.test("POBb.in downloads reject unsuccessful and malformed responses", async () => {
  await assertRejects(
    () => loadPobbBuild("https://pobb.in/abcde", async () => ({ body: "missing", status: 404 })),
    Error,
    "Failed to download POBb.in build (404)",
  );
  await assertRejects(
    () => loadPobbBuild("https://pobb.in/abcde", async () => ({ body: '{"content":"build-code"}', status: 200 })),
    Error,
    "Invalid POBb.in build response",
  );
});
