interface Env {
  KV: KVNamespace;
}

interface Metadata {
  dir: boolean;
}

async function listKeys(kv: KVNamespace, prefix: string) {
  const keys: KVNamespaceListResult<Metadata>["keys"] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list<Metadata>({ prefix, cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor !== undefined);
  return keys;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const ns = context.request.headers.get("x-user-namespace");
  const sub = context.data.sub;
  const path = Array.isArray(context.params.name)
    ? context.params.name.map(decodeURIComponent).join("/")
    : context.params.name
    ? decodeURIComponent(context.params.name)
    : undefined;

  if (!path) {
    const prefix = ns ? `user:${sub}:ns-vfs:${ns}:` : `user:${sub}:vfs:`;
    const keys = await listKeys(context.env.KV, prefix);
    const r = keys.map((k) => ({ name: k.name.replace(prefix, ""), metadata: k.metadata }));
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
    default:
      return new Response(null, { status: 405 });
  }
};
