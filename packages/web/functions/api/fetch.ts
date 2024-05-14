interface Env {
  KV: KVNamespace;
}

interface FetchRequest {
  url: string;
  body?: string;
  headers: Record<string, string>;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const req: FetchRequest = await context.request.json();
  try {
    let r;
    if (req.body) {
      r = new Request(req.url, {
        method: "POST",
        body: req.body,
        headers: Object.assign({}, req.headers, {
          "User-Agent": "pob.cool",
        }),
      });
    } else {
      r = new Request(req.url, {
        method: "GET",
        headers: Object.assign({}, req.headers, {
          "User-Agent": "pob.cool",
        }),
      });
    }
    const rep = await fetch(r);

    return new Response(
      JSON.stringify({
        body: await rep.text(),
        headers: rep.headers,
        status: rep.status,
      }),
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        body: undefined,
        headers: {},
        error: e.message,
      }),
    );
  }
};
