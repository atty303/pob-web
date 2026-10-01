import { assert, assertEquals, assertNotEquals, assertRejects, assertStrictEquals } from "@std/assert";
import { ImageRepository, TextureFlags } from "../../src/js/image.ts";

const flags = TextureFlags.TF_NOMIPMAP;

async function withImages(run: (requests: string[], respond: (response: Response) => void) => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const originalDecode = globalThis.createImageBitmap;
  const requests: string[] = [];
  let respond!: (response: Response) => void;
  const response = new Promise<Response>((resolve) => {
    respond = resolve;
  });
  globalThis.fetch = ((input: RequestInfo | URL) => {
    requests.push(String(input));
    return response.then((value) => value.clone());
  }) as typeof fetch;
  globalThis.createImageBitmap =
    (() => Promise.resolve({ width: 2, height: 2 } as ImageBitmap)) as typeof createImageBitmap;
  try {
    await run(requests, respond);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.createImageBitmap = originalDecode;
  }
}

Deno.test("image aliases share in-flight decoding and GPU identity without repeat redraw completions", async () => {
  await withImages(async (requests, respond) => {
    const repo = new ImageRepository("/assets/");
    const first = repo.load(1, "influence.png", flags);
    assert(first instanceof Promise);
    for (let handle = 1; handle <= 1000; handle++) {
      assertStrictEquals(repo.load(handle, "influence.png", flags), undefined);
      assertStrictEquals(repo.get(handle), undefined);
    }
    assertEquals(requests, ["/assets/influence.png"]);
    respond(new Response("pixels"));
    assertEquals(await first, true);
    const bitmap = repo.get(1);
    assert(bitmap);
    for (let handle = 1; handle <= 1000; handle++) {
      assertStrictEquals(repo.get(handle), bitmap);
      assertStrictEquals(repo.load(handle, "influence.png", flags), undefined);
    }
    assertEquals(requests.length, 1);
  });
});

Deno.test("image cache separates source and sampler flags", async () => {
  await withImages(async (requests, respond) => {
    const repo = new ImageRepository("/assets/");
    const loads = [
      repo.load(1, "a.png", flags),
      repo.load(2, "a.png", flags | TextureFlags.TF_NEAREST),
      repo.load(3, "b.png", flags),
    ];
    respond(new Response("pixels"));
    assertEquals(await Promise.all(loads), [true, true, true]);
    assertEquals(requests.length, 3);
    assertNotEquals(repo.get(1)?.id, repo.get(2)?.id);
    assertNotEquals(repo.get(1)?.id, repo.get(3)?.id);
    assertEquals(repo.get(2)?.source.flags, flags | TextureFlags.TF_NEAREST);
  });
});

Deno.test("reloading a handle switches its source without corrupting existing aliases", async () => {
  await withImages(async (_requests, respond) => {
    const repo = new ImageRepository("/assets/");
    const first = repo.load(1, "a.png", flags);
    repo.load(2, "a.png", flags);
    const second = repo.load(1, "b.png", flags);
    respond(new Response("pixels"));
    await Promise.all([first, second]);
    assertNotEquals(repo.get(1)?.id, repo.get(2)?.id);
    assertEquals(repo.load(1, "a.png", flags), undefined);
    assertStrictEquals(repo.get(1), repo.get(2));
  });
});

Deno.test("missing images do not create a retry or redraw loop", async () => {
  await withImages(async (requests, respond) => {
    const repo = new ImageRepository("/assets/");
    const load = repo.load(1, "missing.png", flags);
    respond(new Response(null, { status: 404 }));
    assertEquals(await load, false);
    assertEquals(repo.load(2, "missing.png", flags), undefined);
    assertEquals(repo.get(2), undefined);
    assertEquals(requests.length, 1);
  });
});

Deno.test("fetch rejection remains observable once without repeated retries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("offline"));
  try {
    const repo = new ImageRepository("/assets/");
    const load = repo.load(1, "a.png", flags);
    assert(load);
    await assertRejects(() => load, Error, "offline");
    assertEquals(repo.load(2, "a.png", flags), undefined);
    assertEquals(repo.get(2), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
