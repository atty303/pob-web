interface Env {
  KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const sub = context.data.sub;
  const path = Array.isArray(context.params.name) ? context.params.name.join("/") : context.params.name;
  const key = `user:${sub}:vfs:${path}`;
  switch (context.request.method) {
    case "GET": {
      const r = await context.env.KV.get(key, { type: "arrayBuffer" });
      if (!r) {
        return new Response(null, { status: 404 });
      }
      return new Response(r);
    }
    case "PUT": {
      const overwrite = new URL(context.request.url).searchParams.get("overwrite") === "true";
      const body = await context.request.arrayBuffer();
      const existing = await context.env.KV.get(key);
      if (!overwrite && existing) {
        return new Response(null, { status: 201 });
      }
      const data = new Uint8Array(body);
      await context.env.KV.put(`user:${sub}:vfs:${path}`, data);
      return new Response(null, { status: 204 });
    }
    case "DELETE": {
      await context.env.KV.delete(`user:${sub}:vfs:${path}`);
      return new Response(null, { status: 204 });
    }
  }
};
