interface Env {
    KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const sub = context.data.sub;
    const path = Array.isArray(context.params.path) ? context.params.path.join("/") : context.params.path;
    const r = await context.env.KV.get(`user:${sub}:vfs:${path}`);
    return new Response(r);
}
