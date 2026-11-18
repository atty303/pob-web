import { assert } from "@std/assert";

Deno.test("Lua compound assignments preserve the pinned LuaJIT semantics in Wasm", async () => {
  const output: string[] = [];
  const errors: string[] = [];
  const { default: createModule } = await import("../../build/driver_lua_compound_test.mjs");
  await createModule({
    print: (message: string) => output.push(message),
    printErr: (message: string) => errors.push(message),
  });
  assert(
    output.includes("Lua compound assignment compatibility passed"),
    `Lua compound assignment regression script did not complete:\n${errors.join("\n")}`,
  );
});
