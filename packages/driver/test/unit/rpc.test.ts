import { assertEquals, assertThrows } from "@std/assert";
import { environmentErrorCategory, markEnvironmentError } from "../../src/js/error.ts";
import { prepareFetchHeaders, restoreRpcError, rpcErrorMetadata } from "../../src/js/rpc.ts";

Deno.test("fetch headers reject POESESSID without forwarding it", () => {
  assertThrows(() => prepareFetchHeaders({ cookie: "poesessid=secret" }), Error, "POESESSID");
  assertThrows(() => prepareFetchHeaders({ PoEsEsSiD: "secret" }), Error, "POESESSID");
});

Deno.test("fetch headers preserve content type or supply the legacy default", () => {
  assertEquals(prepareFetchHeaders({ Accept: "application/json" }), {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  });
  assertEquals(prepareFetchHeaders({ "content-type": "application/json" }), {
    "content-type": "application/json",
  });
  assertEquals(prepareFetchHeaders({ "User-Agent": "Path of Building/0.23.1" }), {
    "User-Agent": "Path of Building/0.23.1",
    "Content-Type": "application/x-www-form-urlencoded",
  });
});

Deno.test("environment error categories survive RPC error serialization", () => {
  const original = markEnvironmentError(new Error("OPFS initialization failed"), "storage");

  const restored = restoreRpcError(rpcErrorMetadata(original), "RPC failed");

  assertEquals(restored.message, original.message);
  assertEquals(environmentErrorCategory(restored), "storage");
});
