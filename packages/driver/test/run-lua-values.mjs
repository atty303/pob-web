import { pathToFileURL } from "node:url";

const filename = process.argv[2];
if (!filename) throw new Error("Usage: node test/run-lua-values.mjs <driver_lua_values_test.mjs>");
const { default: createModule } = await import(pathToFileURL(filename).href);
let completed = false;
await createModule({
  print(line) {
    console.log(line);
    if (line === "Lua numeric, tag, table, closure, coroutine, UTF-8 and GC tests passed") completed = true;
  },
});
if (!completed) throw new Error("The Lua value test did not execute to completion");
