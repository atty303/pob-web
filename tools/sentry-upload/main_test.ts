import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { findIdenticalFile } from "./main.ts";

Deno.test("findIdenticalFile selects the matching build asset", async () => {
  const directory = await Deno.makeTempDir();
  try {
    const source = join(directory, "driver.wasm");
    const matching = join(directory, "driver-matching.wasm");
    const other = join(directory, "driver-other.wasm");
    await Deno.writeTextFile(source, "release");
    await Deno.writeTextFile(matching, "release");
    await Deno.writeTextFile(other, "debug");

    assertEquals(await findIdenticalFile(source, [other, matching]), matching);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("findIdenticalFile rejects missing and ambiguous matches", async () => {
  const directory = await Deno.makeTempDir();
  try {
    const source = join(directory, "driver.wasm");
    const first = join(directory, "driver-first.wasm");
    const second = join(directory, "driver-second.wasm");
    await Deno.writeTextFile(source, "release");
    await Deno.writeTextFile(first, "release");
    await Deno.writeTextFile(second, "release");

    await assertRejects(() => findIdenticalFile(source, []), Error, "found 0");
    await assertRejects(() => findIdenticalFile(source, [first, second]), Error, "found 2");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
