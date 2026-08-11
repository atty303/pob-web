import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { SignJWT } from "jose";
import {
  authenticateWithPoe,
  corsFetchPolicy,
  createPoeOAuthBridge,
  getPoeAccessToken,
  poeAccessToken,
  poeOAuthGrant,
  poeOAuthState,
  poeOAuthTokenResponse,
} from "../../src/lib/poe-oauth.ts";

const claim = "https://pob.cool/poe/access_token";
const jwt = (payload: Record<string, unknown>) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("test-secret"));

Deno.test("PoE OAuth helpers bridge Auth0 claims and upstream requests", async () => {
  const token = await jwt({ [claim]: "poe-token" });

  assertEquals(poeAccessToken(token), "poe-token");
  assertEquals(poeOAuthState("https://www.pathofexile.com/oauth/authorize?state=sentinel"), "sentinel");
  assertEquals(
    poeOAuthGrant(
      "https://www.pathofexile.com/oauth/token",
      "grant_type=authorization_code&code=ignored",
    ),
    "authorization_code",
  );
  assertEquals(JSON.parse(poeOAuthTokenResponse("poe-token")), {
    access_token: "poe-token",
    expires_in: 2_419_200,
    refresh_token: "auth0-reauthorize",
    token_type: "bearer",
  });
});

Deno.test("PoE authentication synchronizes the popup session into the application client", async () => {
  const token = await jwt({ [claim]: "shared-poe-token" });
  const cacheModes: Array<string | undefined> = [];

  const result = await authenticateWithPoe(
    {
      isAuthenticated: false,
      getAccessTokenSilently: ({ cacheMode } = {}) => {
        cacheModes.push(cacheMode);
        return Promise.resolve(token);
      },
    },
    false,
    () => Promise.resolve(token),
  );

  assertEquals(result, token);
  assertEquals(cacheModes, ["cache-only"]);
  await assertRejects(
    () =>
      authenticateWithPoe(
        {
          isAuthenticated: false,
          getAccessTokenSilently: () => Promise.resolve(token),
        },
        false,
        () => jwt({ [claim]: "different-poe-token" }),
      ),
    Error,
    "did not update the application session",
  );
});

Deno.test("PoE OAuth bridge preserves the upstream authorization, exchange, and refresh contract", async () => {
  const sessionToken = await jwt({ [claim]: "session-poe-token" });
  const refreshedToken = await jwt({ [claim]: "refreshed-poe-token" });
  const forceAuthorizations: boolean[] = [];
  const timeouts: number[] = [];
  const bridge = createPoeOAuthBridge(
    () => ({ isAuthenticated: true, getAccessTokenSilently: () => Promise.resolve(sessionToken) }),
    (forceAuthorization, timeoutMs) => {
      forceAuthorizations.push(forceAuthorization);
      timeouts.push(timeoutMs);
      return Promise.resolve(refreshedToken);
    },
  );

  const authorization = await bridge.authorize(
    "https://www.pathofexile.com/oauth/authorize?state=upstream-state",
    60_000,
  );
  assertEquals(authorization.state, "upstream-state");
  assertEquals("code" in authorization, true);
  assertEquals(
    JSON.parse(
      (await bridge.exchange(
        "https://www.pathofexile.com/oauth/token",
        "grant_type=authorization_code&code=upstream-code",
      ))!,
    ).access_token,
    "session-poe-token",
  );
  assertEquals(forceAuthorizations, []);

  assertEquals(
    JSON.parse(
      (await bridge.exchange(
        "https://www.pathofexile.com/oauth/token",
        "grant_type=refresh_token&refresh_token=auth0-reauthorize",
      ))!,
    ).access_token,
    "refreshed-poe-token",
  );
  assertEquals(forceAuthorizations, [true]);
  assertEquals(timeouts, [110_000]);
});

Deno.test("only CORS-capable PoE APIs bypass the proxy", () => {
  assertEquals(corsFetchPolicy("https://api.pathofexile.com/character", "http://localhost:5173"), "direct");
  assertEquals(corsFetchPolicy("https://pobb.in/example", "https://pob.cool"), "direct");
  assertEquals(corsFetchPolicy("https://pobb.in/example", "http://localhost:5173"), "fallback");
  assertEquals(
    corsFetchPolicy("https://www.pathofexile.com/api/trade/search/Standard", "https://pob.cool"),
    undefined,
  );
});

Deno.test("the deployed OAuth helper detaches cross-origin isolation headers", async () => {
  const headers = await Deno.readTextFile(new URL("../../public/_headers", import.meta.url));
  assertStringIncludes(headers, "/*\n  Cross-Origin-Opener-Policy: same-origin");
  assertStringIncludes(
    headers,
    "/auth/poe-popup\n  ! Cross-Origin-Opener-Policy\n  ! Cross-Origin-Embedder-Policy",
  );
});

Deno.test("PoE reauthorization uses the popup token without silent refresh", async () => {
  let silentCalls = 0;
  let popupCalls = 0;
  const token = await getPoeAccessToken(
    {
      isAuthenticated: true,
      getAccessTokenSilently: () => {
        silentCalls += 1;
        return Promise.reject(new Error("silent refresh must not run"));
      },
    },
    true,
    async (forceAuthorization) => {
      popupCalls += 1;
      assertEquals(forceAuthorization, true);
      return await jwt({ [claim]: "new-poe-token" });
    },
  );

  assertEquals(token, "new-poe-token");
  assertEquals({ popupCalls, silentCalls }, { popupCalls: 1, silentCalls: 0 });
});

Deno.test("PoE initial authorization reuses Auth0 and falls back when its token lacks the provider claim", async () => {
  const existing = await jwt({ [claim]: "existing-poe-token" });
  let popupCalls = 0;
  const fromSession = await getPoeAccessToken(
    { isAuthenticated: true, getAccessTokenSilently: () => Promise.resolve(existing) },
    false,
    () => {
      popupCalls += 1;
      return Promise.reject(new Error("popup must not open"));
    },
  );
  assertEquals(fromSession, "existing-poe-token");
  assertEquals(popupCalls, 0);

  const withoutClaim = await jwt({});
  const fromPopup = await getPoeAccessToken(
    { isAuthenticated: true, getAccessTokenSilently: () => Promise.resolve(withoutClaim) },
    false,
    async (forceAuthorization) => {
      popupCalls += 1;
      assertEquals(forceAuthorization, false);
      return await jwt({ [claim]: "popup-poe-token" });
    },
  );
  assertEquals(fromPopup, "popup-poe-token");
  assertEquals(popupCalls, 1);

  await assertRejects(
    () =>
      getPoeAccessToken(
        { isAuthenticated: false, getAccessTokenSilently: () => Promise.reject(new Error("must not run")) },
        false,
        () => Promise.resolve(withoutClaim),
      ),
    Error,
    "Auth0 token did not contain a PoE access token",
  );
});
