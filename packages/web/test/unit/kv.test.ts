import { assertEquals } from "@std/assert";
import { onRequest } from "../../functions/api/kv/[[name]].ts";

Deno.test("KV listing includes every page of legacy build keys", async () => {
  const calls: Array<KVNamespaceListOptions> = [];
  const kv = {
    list(options: KVNamespaceListOptions) {
      calls.push(options);
      if (!options.cursor) {
        return Promise.resolve({
          keys: [],
          list_complete: false,
          cursor: "next-page",
          cacheStatus: null,
        });
      }
      return Promise.resolve({
        keys: [
          { name: "user:legacy-user:vfs:first.xml" },
          { name: "user:legacy-user:vfs:Folder/second.xml", metadata: { mode: 0o100644, size: 7 } },
        ],
        list_complete: true,
        cacheStatus: null,
      });
    },
  } as unknown as KVNamespace;
  const response = await onRequest(
    {
      request: new Request("https://example.test/api/kv/"),
      env: { KV: kv },
      data: { sub: "legacy-user" },
      params: { name: undefined },
    } as unknown as Parameters<typeof onRequest>[0],
  );

  assertEquals(await response.json(), [
    { name: "first.xml" },
    { name: "Folder/second.xml", metadata: { mode: 0o100644, size: 7 } },
  ]);
  assertEquals(calls, [
    { prefix: "user:legacy-user:vfs:", cursor: undefined },
    { prefix: "user:legacy-user:vfs:", cursor: "next-page" },
  ]);
});
