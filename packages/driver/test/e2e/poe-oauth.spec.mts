import { expect, test } from "../../../../tools/playwright.mts";
import { clickPoBAndWaitForInput, waitForPoBReady } from "./pob.mts";
import { releases } from "./releases.mts";

const IMPORT_TAB = { x: 70, y: 70 };
const AUTHORIZE = { x: 425, y: 98 };
const LOGOUT = {
  poe1: { x: 616, y: 72 },
  poe2: { x: 840, y: 72 },
};
const FETCH_CHARACTERS = {
  poe1: { x: 460, y: 122 },
  poe2: { x: 746, y: 98 },
};
const TOKEN_ENDPOINT = "https://www.pathofexile.com/oauth/token";

for (const release of releases.filter(({ game }) => game === "poe1" || game === "poe2")) {
  test(`${release.game} OAuth authorization and refresh follow the browser host contract`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "The upstream Lua and host RPC contract is browser-independent");
    test.setTimeout(120_000);
    await openImport(page, release, { "poe-oauth-expires-in": "1" });

    await clickPoBAndWaitForInput(page, AUTHORIZE);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.authorizationRequests.length)).toBe(1);
    expect((await oauthTrace(page)).fetchRequests).toEqual([]);
    expect(await driverErrors(page)).toEqual([]);

    await clickPoBAndWaitForInput(page, AUTHORIZE);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.authorizationRequests.length)).toBe(2);
    expect((await oauthTrace(page)).fetchRequests).toEqual([]);
    expect(await driverErrors(page)).toEqual([]);

    await clickPoBAndWaitForInput(page, AUTHORIZE);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.fetchRequests.length)).toBe(2);

    const initial = await oauthTrace(page);
    expect(initial.authorizationRequests).toHaveLength(3);
    initial.authorizationRequests.forEach((request) => assertAuthorizationRequest(request, release.game));
    const [exchange, initialCharacter] = initial.fetchRequests;
    assertTokenRequest(exchange, "authorization_code");
    expect(new URLSearchParams(exchange.body).get("code")).toBe("mock-authorization-code");
    expect(new URLSearchParams(exchange.body).get("client_id")).toBe("pob");
    await assertPkce(initial.authorizationRequests[2], exchange);
    assertCharacterRequest(initialCharacter, "mock-initial-token");
    expect(await driverErrors(page)).toEqual([]);

    await page.waitForTimeout(2_500);
    await openImport(page, release);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.fetchRequests.length)).toBe(1);
    const [expiryRefresh] = (await oauthTrace(page)).fetchRequests;
    assertTokenRequest(expiryRefresh, "refresh_token");
    expect(new URLSearchParams(expiryRefresh.body).get("refresh_token")).toBe("mock-refresh-token");
    await clickPoBAndWaitForInput(page, FETCH_CHARACTERS[release.game as "poe1" | "poe2"]);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.fetchRequests.length)).toBe(2);
    const expired = await oauthTrace(page);
    expect(expired.authorizationRequests).toEqual([]);
    const afterExpiry = expired.fetchRequests[1];
    assertCharacterRequest(afterExpiry, "mock-refreshed-token-1");
    expect(await driverErrors(page)).toEqual([]);

    await openImport(page, release, { "poe-oauth-api": "401,200", "poe-oauth-refresh-start": "1" });
    expect((await oauthTrace(page)).fetchRequests).toEqual([]);
    await clickPoBAndWaitForInput(page, FETCH_CHARACTERS[release.game as "poe1" | "poe2"]);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.fetchRequests.length)).toBe(3);
    const unauthorized = await oauthTrace(page);
    expect(unauthorized.authorizationRequests).toEqual([]);
    const [unauthorizedCharacter, unauthorizedRefresh, retriedCharacter] = unauthorized.fetchRequests;
    assertCharacterRequest(unauthorizedCharacter, "mock-refreshed-token-1");
    assertTokenRequest(unauthorizedRefresh, "refresh_token");
    assertCharacterRequest(retriedCharacter, "mock-refreshed-token-2");
    expect(retriedCharacter.url).toBe(unauthorizedCharacter.url);
    expect(await driverErrors(page)).toEqual([]);

    await clickPoBAndWaitForInput(page, LOGOUT[release.game as "poe1" | "poe2"]);
    await expect.poll(() => oauthTrace(page).then((trace) => trace.logoutCalls)).toBe(1);
  });
}

async function openImport(
  page: import("@playwright/test").Page,
  release: { game: string; version: string },
  options: Record<string, string> = {},
) {
  const params = new URLSearchParams({ game: release.game, version: release.version, "poe-oauth": "mock", ...options });
  await page.goto(`/?${params}`);
  await waitForPoBReady(page);
  const frame = await page.evaluate(() => window.__POB_TEST__?.frameCount ?? 0);
  await clickPoBAndWaitForInput(page, IMPORT_TAB);
  await page.waitForFunction((previous) => (window.__POB_TEST__?.frameCount ?? 0) >= previous + 3, frame);
}

function assertAuthorizationRequest(
  request: { url: string; timeoutMs: number },
  game: string,
) {
  const authorizationUrl = new URL(request.url);
  expect(authorizationUrl.origin).toBe("https://www.pathofexile.com");
  expect(authorizationUrl.pathname).toBe("/oauth/authorize");
  expect(authorizationUrl.searchParams.get("client_id")).toBe("pob");
  expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
  expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authorizationUrl.searchParams.get("code_challenge")).toBeTruthy();
  expect(authorizationUrl.searchParams.get("state")).toBeTruthy();
  expect(new Set(authorizationUrl.searchParams.get("scope")?.split(" "))).toEqual(
    new Set(["account:profile", "account:leagues", "account:characters", "account:trade"]),
  );
  expect(request.timeoutMs).toBe(game === "poe1" ? 60_000 : 30_000);
}

function assertTokenRequest(request: { url: string; body?: string }, grant: string) {
  expect(request.url).toBe(TOKEN_ENDPOINT);
  expect(new URLSearchParams(request.body).get("grant_type")).toBe(grant);
}

async function assertPkce(
  authorizationRequest: { url: string },
  tokenRequest: { body?: string },
) {
  const verifier = new URLSearchParams(tokenRequest.body).get("code_verifier");
  expect(verifier).toBeTruthy();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier!)));
  const challenge = btoa(String.fromCharCode(...digest)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  expect(new URL(authorizationRequest.url).searchParams.get("code_challenge")).toBe(challenge);
}

function assertCharacterRequest(request: { url: string; headers: Record<string, string> }, accessToken: string) {
  expect(request.url).toMatch(/^https:\/\/api\.pathofexile\.com\/character/);
  expect(request.headers.Authorization).toBe(`Bearer ${accessToken}`);
}

async function oauthTrace(page: import("@playwright/test").Page) {
  return await page.evaluate(() => {
    const trace = window.__POB_TEST__?.poeOAuth;
    if (!trace) throw new Error("PoE OAuth test trace is unavailable");
    return trace;
  });
}

async function driverErrors(page: import("@playwright/test").Page) {
  return (await page.evaluate(() => window.__POB_TEST__?.errors)) ?? [];
}
