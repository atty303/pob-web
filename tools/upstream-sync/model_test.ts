import { assertEquals, assertThrows } from "@std/assert";
import { findNewTags, mergeMatrixResults, parseMatrixResult, type Versions } from "./model.ts";

function versions(): Versions {
  return {
    poe1: { head: "v1", versions: [{ value: "v1", date: "2026-01-01T00:00:00Z" }] },
    poe2: { head: "v2", versions: [{ value: "v2", date: "2026-01-01T00:00:00Z" }] },
    le: { head: "v3", versions: [{ value: "v3", date: "2026-01-01T00:00:00Z" }] },
  };
}

Deno.test("findNewTags excludes every known version", () => {
  assertEquals(
    findNewTags(
      [
        { name: "v3", committedDate: "2026-03-01T00:00:00Z" },
        { name: "v2", committedDate: "2026-02-01T00:00:00Z" },
      ],
      [{ value: "v2", date: "2026-02-01T00:00:00Z", testResult: "failed" }],
    ),
    [{ name: "v3", committedDate: "2026-03-01T00:00:00Z" }],
  );
});

Deno.test("mergeMatrixResults selects the newest tested release and preserves untested history", () => {
  const merged = mergeMatrixResults(versions(), [
    {
      game: "poe1",
      releases: [
        { value: "v4", date: "2026-04-01T00:00:00Z", testResult: "failed" },
        { value: "v3", date: "2026-03-01T00:00:00Z", testResult: "tested" },
        { value: "v2", date: "2026-02-01T00:00:00Z", testResult: "tested" },
      ],
    },
    { game: "poe2", releases: [{ value: "v4", date: "2026-04-01T00:00:00Z", testResult: "failed" }] },
  ]);

  assertEquals(merged.poe1.head, "v3");
  assertEquals(merged.poe1.versions.at(-1), { value: "v1", date: "2026-01-01T00:00:00Z" });
  assertEquals(merged.poe2.head, "v2");
  assertEquals(merged.le, versions().le);
});

Deno.test("mergeMatrixResults rejects duplicate game artifacts", () => {
  assertThrows(
    () => mergeMatrixResults(versions(), [{ game: "le", releases: [] }, { game: "le", releases: [] }]),
    TypeError,
    "Duplicate matrix result",
  );
});

Deno.test("parseMatrixResult requires an explicit result", () => {
  assertThrows(
    () => parseMatrixResult({ game: "poe1", releases: [{ value: "v2", date: "2026-02-01T00:00:00Z" }] }),
    TypeError,
    "untested release",
  );
});
