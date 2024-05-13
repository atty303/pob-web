import * as jose from "jose";

const JWKS = jose.createRemoteJWKSet(
	new URL("https://pob-web.us.auth0.com/.well-known/jwks.json"),
);

export async function onRequest(context) {
	const jwt = context.request.headers.get("Authorization")?.split("Bearer ")[1];
	if (!jwt) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const { payload } = await jose.jwtVerify(jwt, JWKS, {
			issuer: "https://pob-web.us.auth0.com/",
			audience: "https://pob.cool/api",
		});
		context.data = { sub: payload.sub };
		return await context.next();
	} catch (e) {
		return new Response("Unauthorized", { status: 403 });
	}
}
