import { assertEquals } from "@std/assert";

type PostLoginAction = (
  event: {
    client: { client_id: string };
    connection: { name: string };
    secrets: Record<string, string>;
    user: { user_id: string };
  },
  api: { accessToken: { setCustomClaim: (name: string, value: string) => void } },
) => Promise<void>;

async function loadAction(fetch: typeof globalThis.fetch): Promise<PostLoginAction> {
  const source = await Deno.readTextFile(
    new URL("../../../../auth0/actions/poe-token-bridge.js", import.meta.url),
  );
  const actionExports: { onExecutePostLogin?: PostLoginAction } = {};
  new Function("exports", "fetch", source)(actionExports, fetch);
  if (!actionExports.onExecutePostLogin) throw new Error("Action did not export onExecutePostLogin");
  return actionExports.onExecutePostLogin;
}

const targetEvent = {
  client: { client_id: "o8TOT9gDHzztbdIIIV54HxlfaSMFYTeH" },
  connection: { name: "path-of-exile" },
  secrets: {
    MANAGEMENT_CLIENT_ID: "management-client",
    MANAGEMENT_CLIENT_SECRET: "management-secret",
  },
  user: { user_id: "oauth2|path-of-exile|user" },
};

Deno.test("PoE token bridge ignores other Auth0 clients", async () => {
  const action = await loadAction(() => {
    throw new Error("unexpected fetch");
  });
  const claims: Array<[string, string]> = [];

  await action(
    { ...targetEvent, client: { client_id: "other-client" } },
    { accessToken: { setCustomClaim: (name, value) => claims.push([name, value]) } },
  );

  assertEquals(claims, []);
});

Deno.test("PoE token bridge adds the provider access token claim", async () => {
  const requests: Request[] = [];
  const action = await loadAction(async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    if (request.url.endsWith("/oauth/token")) {
      return Response.json({ access_token: "management-access-token" });
    }
    return Response.json({
      identities: [{ connection: "path-of-exile", access_token: "poe-access-token" }],
    });
  });
  const claims: Array<[string, string]> = [];

  await action(targetEvent, {
    accessToken: { setCustomClaim: (name, value) => claims.push([name, value]) },
  });

  assertEquals(requests.map(({ url }) => url), [
    "https://pob-web.us.auth0.com/oauth/token",
    "https://pob-web.us.auth0.com/api/v2/users/oauth2%7Cpath-of-exile%7Cuser",
  ]);
  assertEquals(claims, [["https://pob.cool/poe/access_token", "poe-access-token"]]);
});
