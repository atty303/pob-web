import { decodeJwt } from "jose";

const POE_ACCESS_TOKEN_CLAIM = "https://pob.cool/poe/access_token";
const POE_TOKEN_ENDPOINT = "https://www.pathofexile.com/oauth/token";
const POE_OAUTH_CHANNEL_PREFIX = "pob-poe-oauth:";

export const POE_OAUTH_PENDING_CHANNEL = "pob-poe-oauth-channel";

export type PoeOAuthWindowMessage = { accessToken: string } | { error: string };

export type PoeOAuthGrant = "authorization_code" | "refresh_token";

type PoeAuth0Client = {
  isAuthenticated: boolean;
  getAccessTokenSilently: () => Promise<string>;
};

export function poeAccessToken(auth0AccessToken: string): string | undefined {
  const value = decodeJwt(auth0AccessToken)[POE_ACCESS_TOKEN_CLAIM];
  return typeof value === "string" ? value : undefined;
}

export async function getPoeAccessToken(
  auth0: PoeAuth0Client,
  forceAuthorization: boolean,
  authorize: (forceAuthorization: boolean) => Promise<string> = authorizePoeWithRedirect,
): Promise<string> {
  if (!forceAuthorization && auth0.isAuthenticated) {
    const accessToken = poeAccessToken(await auth0.getAccessTokenSilently());
    if (accessToken) return accessToken;
  }

  const auth0AccessToken = await authorize(forceAuthorization);
  const accessToken = poeAccessToken(auth0AccessToken);
  if (!accessToken) throw new Error("Auth0 token did not contain a PoE access token");
  return accessToken;
}

export function isPoeOAuthChannel(value: string | null): value is string {
  return value?.startsWith(POE_OAUTH_CHANNEL_PREFIX) === true;
}

function isPoeOAuthWindowMessage(value: unknown): value is PoeOAuthWindowMessage {
  if (!value || typeof value !== "object") return false;
  return (
    ("accessToken" in value && typeof value.accessToken === "string") ||
    ("error" in value && typeof value.error === "string")
  );
}

export function broadcastPoeOAuthResult(channelName: string, message: PoeOAuthWindowMessage) {
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(message);
  channel.close();
}

export function authorizePoeWithRedirect(forceAuthorization: boolean): Promise<string> {
  const id = crypto.randomUUID();
  const channelName = `${POE_OAUTH_CHANNEL_PREFIX}${id}`;
  const channel = new BroadcastChannel(channelName);
  const url = new URL("/auth/poe-popup", window.location.origin);
  url.searchParams.set("channel", channelName);
  if (forceAuthorization) url.searchParams.set("force", "1");

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      channel.close();
      reject(new Error("PoE authorization window timed out"));
    }, 110_000);
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (!isPoeOAuthWindowMessage(data)) return;
      window.clearTimeout(timeout);
      channel.close();
      if ("accessToken" in data) resolve(data.accessToken);
      else reject(new Error(data.error));
    };

    const popup = window.open(
      url,
      `pob-poe-oauth-${id}`,
      "width=500,height=720,resizable,scrollbars=yes,status=1",
    );
    if (!popup) {
      window.clearTimeout(timeout);
      channel.close();
      reject(new Error("Unable to open the PoE authorization window"));
    }
  });
}

export function poeOAuthState(authorizationUrl: string): string {
  const state = new URL(authorizationUrl).searchParams.get("state");
  if (!state) throw new Error("PoE OAuth authorization request did not contain state");
  return state;
}

export function poeOAuthGrant(url: string, body: string | undefined): PoeOAuthGrant | undefined {
  if (url !== POE_TOKEN_ENDPOINT || !body) return undefined;
  const grant = new URLSearchParams(body).get("grant_type");
  return grant === "authorization_code" || grant === "refresh_token" ? grant : undefined;
}

export function poeOAuthTokenResponse(accessToken: string) {
  return JSON.stringify({
    access_token: accessToken,
    expires_in: 2_419_200,
    refresh_token: "auth0-reauthorize",
    token_type: "bearer",
  });
}

export function corsFetchPolicy(url: string, appOrigin: string): "direct" | "fallback" | undefined {
  const { hostname } = new URL(url);
  if (hostname === "api.pathofexile.com") return "direct";
  if (hostname === "pobb.in") return appOrigin === "https://pob.cool" ? "direct" : "fallback";
  return undefined;
}
