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
    let r: Request;
    if (req.body) {
      r = new Request(req.url, {
        method: "POST",
        body: req.body,
        headers: Object.assign({}, req.headers, {
          // "User-Agent": "pob.cool",
        }),
      });
    } else {
      r = new Request(req.url, {
        method: "GET",
        headers: Object.assign({}, req.headers, {
          // "User-Agent": "pob.cool",
        }),
      });
    }
    const rep = await fetch(r);

    const headers = {};
    for (const [key, value] of rep.headers.entries()) {
      headers[key] = value;
    }

    return new Response(
      JSON.stringify({
        body: await rep.text(),
        headers,
        status: rep.status,
      }),
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        body: undefined,
        headers: {},
        error: e.message,
      }),
    );
  }
};
