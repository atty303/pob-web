import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareFetchHeaders } from "../../src/js/rpc";

test("fetch headers reject POESESSID without forwarding it", () => {
  assert.throws(() => prepareFetchHeaders({ cookie: "poesessid=secret" }), /POESESSID/);
  assert.throws(() => prepareFetchHeaders({ PoEsEsSiD: "secret" }), /POESESSID/);
});

test("fetch headers preserve content type or supply the legacy default", () => {
  assert.deepEqual(prepareFetchHeaders({ Accept: "application/json" }), {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  });
  assert.deepEqual(prepareFetchHeaders({ "content-type": "application/json" }), {
    "content-type": "application/json",
  });
});
