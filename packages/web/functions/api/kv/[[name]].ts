interface Env {
  KV: KVNamespace;
}

interface Metadata {
  dir: boolean;
}

export const onRequest: PagesFunction<Env> = async context => {
  const ns = context.request.headers.get("x-user-namespace");
  const sub = context.data.sub;
  const path = Array.isArray(context.params.name)
    ? context.params.name.map(decodeURIComponent).join("/")
    : context.params.name
      ? decodeURIComponent(context.params.name)
      : undefined;

  if (!path) {
    const prefix = ns ? `user:${sub}:ns-vfs:${ns}:` : `user:${sub}:vfs:`;
    const l = await context.env.KV.list({ prefix });
    const r = l.keys.map(k => ({ name: k.name.replace(prefix, ""), metadata: k.metadata }));
    return new Response(JSON.stringify(r));
  }

  const key = ns ? `user:${sub}:ns-vfs:${ns}:${path}` : `user:${sub}:vfs:${path}`;
  switch (context.request.method) {
    case "HEAD": {
      const r = await context.env.KV.getWithMetadata(key, { type: "stream" });
      if (!r) {
        return new Response(null, { status: 404 });
      }
      return new Response(JSON.stringify(r.metadata), { headers: { "content-type": "application/json" } });
    }
    case "GET": {
      const r = await context.env.KV.getWithMetadata(key, { type: "arrayBuffer" });
      if (!r) {
        return new Response(null, { status: 404 });
      }
      return new Response(r.value, { headers: { "x-metadata": JSON.stringify(r.metadata) } });
    }
    case "PUT": {
      const metadata = JSON.parse(context.request.headers.get("x-metadata") || "{}");
      const body = await context.request.arrayBuffer();
      const data = new Uint8Array(body);
      await context.env.KV.put(key, data, { metadata });
      return new Response(null, { status: 204 });
    }
    case "DELETE": {
      await context.env.KV.delete(key);
      return new Response(null, { status: 204 });
    }
  }
};
