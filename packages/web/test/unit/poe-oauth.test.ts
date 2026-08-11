import { assertEquals, assertStringIncludes } from "@std/assert";
import { SignJWT } from "jose";
import {
  corsFetchPolicy,
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
