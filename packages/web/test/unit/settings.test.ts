import { assertEquals } from "@std/assert";
import { defaultWebSettings, loadWebSettings, saveWebSettings } from "../../src/lib/settings.ts";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

Deno.test("web settings use defaults and round-trip through storage", () => {
  const storage = memoryStorage();
  assertEquals(loadWebSettings(storage), defaultWebSettings);

  const settings = { performanceOverlay: true };
  assertEquals(saveWebSettings(storage, settings), true);
  assertEquals(loadWebSettings(storage), settings);
});

Deno.test("web settings recover valid fields from partial or malformed storage", () => {
  assertEquals(loadWebSettings(memoryStorage('{"webGPU":true}')), {
    performanceOverlay: false,
  });
  assertEquals(loadWebSettings(memoryStorage('{"webGPU":"yes","performanceOverlay":true}')), {
    performanceOverlay: true,
  });
  assertEquals(loadWebSettings(memoryStorage("invalid")), defaultWebSettings);
});

Deno.test("web settings tolerate unavailable storage", () => {
  assertEquals(
    loadWebSettings({
      getItem: () => {
        throw new Error("blocked");
      },
    }),
    defaultWebSettings,
  );
  assertEquals(
    saveWebSettings({
      setItem: () => {
        throw new Error("blocked");
      },
    }, { performanceOverlay: true }),
    false,
  );
});
