import { assertEquals } from "@std/assert";
import { configure, fs, InMemory } from "@zenfs/core";
import { FilesystemRpcHandler } from "../../src/js/filesystem-handler.ts";

Deno.test("cloud mount stats are always writable for WasmFS", async () => {
  await configure({ mounts: { "/": InMemory } });
  const cloudDirectory = "/user/Path of Building/Builds/Cloud";
  await fs.promises.mkdir(cloudDirectory, { recursive: true, mode: 0 });
  await fs.promises.writeFile(`${cloudDirectory}/build.xml`, "build", { mode: 0 });

  const handler = new FilesystemRpcHandler();
  handler.reset(cloudDirectory);

  const directory = await handler.handle("lstat", [cloudDirectory]);
  const file = await handler.handle("stat", [`${cloudDirectory}/build.xml`]);
  assertEquals((directory.value as { mode: number }).mode & 0o777, 0o777);
  assertEquals((file.value as { mode: number }).mode & 0o777, 0o777);
});
