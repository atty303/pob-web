interface Env {
	KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	const sub = context.data.sub;
	const prefix = `user:${sub}:vfs:`;
	const l = await context.env.KV.list({ prefix });
	const r = l.keys.map((k) => k.name.replace(prefix, ""));
	return new Response(JSON.stringify(r));
};
