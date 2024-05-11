interface Env {
    KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const sub = context.data.sub;
    const path = Array.isArray(context.params.path) ? context.params.path.join("/") : context.params.path;
    const data = await context.request.blob();
    await context.env.KV.put(`user:${sub}:vfs:${path}`, data.stream());
    return new Response("OK");
}
