interface Env {
    KV: KVNamespace;
}

interface FetchRequest {
    url: string;
    body?: string;
    headers: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const req: FetchRequest = await context.request.json();

    const rep = await fetch(new Request(req.url, {
        method: "GET",
    }));

    return new Response(JSON.stringify({
        body: await rep.text(),
        headers: rep.headers,
        status: rep.status,
    }));
}
