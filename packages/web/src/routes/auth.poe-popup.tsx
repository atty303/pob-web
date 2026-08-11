import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { broadcastPoeOAuthResult, isPoeOAuthChannel, POE_OAUTH_PENDING_CHANNEL } from "../lib/poe-oauth.ts";

export default function PoeOAuthPopup() {
  const auth0 = useAuth0();
  const started = useRef(false);
  const [message, setMessage] = useState("Starting Path of Exile authorization…");

  useEffect(() => {
    if (auth0.isLoading || started.current) return;
    started.current = true;

    const finish = (channelName: string, result: { accessToken: string } | { error: string }) => {
      sessionStorage.removeItem(POE_OAUTH_PENDING_CHANNEL);
      broadcastPoeOAuthResult(channelName, result);
      window.close();
    };

    const pendingChannel = sessionStorage.getItem(POE_OAUTH_PENDING_CHANNEL);
    if (isPoeOAuthChannel(pendingChannel)) {
      if (auth0.error) {
        finish(pendingChannel, { error: auth0.error.message });
      } else if (auth0.isAuthenticated) {
        setMessage("Completing authorization…");
        void auth0.getAccessTokenSilently().then(
          (accessToken) => finish(pendingChannel, { accessToken }),
          (error) =>
            finish(pendingChannel, {
              error: error instanceof Error ? error.message : "Unable to retrieve the Auth0 access token",
            }),
        );
      } else {
        finish(pendingChannel, { error: "Path of Exile authorization did not complete" });
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const channelName = params.get("channel");
    if (!isPoeOAuthChannel(channelName)) {
      setMessage("Invalid Path of Exile authorization request");
      return;
    }

    sessionStorage.setItem(POE_OAUTH_PENDING_CHANNEL, channelName);
    setMessage("Redirecting to Path of Exile…");
    void auth0.loginWithRedirect({
      appState: { returnTo: "/auth/poe-popup" },
      authorizationParams: {
        connection: "path-of-exile",
        redirect_uri: `${window.location.origin}/auth/poe-popup`,
        ...(params.get("force") === "1" ? { prompt: "login" as const } : {}),
      },
    }).catch((error) => {
      finish(channelName, { error: error instanceof Error ? error.message : "Unable to start PoE authorization" });
    });
  }, [auth0]);

  return <main className="grid min-h-full place-items-center bg-base text-base-content">{message}</main>;
}
