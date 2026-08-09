import { assertEquals } from "@std/assert";
import { getLatestTags, type GraphqlClient } from "./github.ts";

Deno.test("getLatestTags follows pagination, unwraps annotated tags, and sorts by commit date", async () => {
  const cursors: unknown[] = [];
  const client: GraphqlClient = (body) => {
    cursors.push(body.variables.cursor);
    if (body.variables.cursor === null) {
      return Promise.resolve({
        data: {
          repository: {
            refs: {
              pageInfo: { hasNextPage: true, endCursor: "next" },
              nodes: [{ name: "v1", target: { committedDate: "2026-01-01T00:00:00Z" } }],
            },
          },
        },
      });
    }
    return Promise.resolve({
      data: {
        repository: {
          refs: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ name: "v2", target: { target: { committedDate: "2026-02-01T00:00:00Z" } } }],
          },
        },
      },
    });
  };

  assertEquals(await getLatestTags(client, { owner: "owner", name: "repo" }), [
    { name: "v2", committedDate: "2026-02-01T00:00:00Z" },
    { name: "v1", committedDate: "2026-01-01T00:00:00Z" },
  ]);
  assertEquals(cursors, [null, "next"]);
});
