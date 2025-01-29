import "./app.css";

import { Auth0Provider } from "@auth0/auth0-react";
import * as Sentry from "@sentry/react";
import type React from "react";

import "./lib/logger";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from "react-router";
import { RecoilRoot } from "recoil";
import type { Route } from "./+types/root";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Poiret+One&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=1280, initial-scale=1.0" />
        <title>pob.cool</title>
        <meta property="og:title" content="pob.cool" />
        <meta property="og:description" content="A web version of Path of Building" />
        <meta property="og:image" content="https://pob.cool/favicon.png" />
        <meta property="og:url" content="https://pob.cool" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@atty303" />
        <meta name="twitter:creator" content="@atty303" />
        <Meta />
        <Links />
      </head>
      <body className="bg-base text-base-content ">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <RecoilRoot>
      <Auth0Provider
        domain="pob-web.us.auth0.com"
        clientId="o8TOT9gDHzztbdIIIV54HxlfaSMFYTeH"
        legacySameSiteCookie={false}
        useRefreshTokens={true}
        cacheLocation={"localstorage"}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: "https://pob.cool/api",
          scope: "openid profile email offline_access",
        }}
      >
        <Outlet />
      </Auth0Provider>
    </RecoilRoot>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="p-16 max-w-full prose">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
