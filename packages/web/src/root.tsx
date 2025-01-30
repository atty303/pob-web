import "./app.css";

import { Auth0Provider } from "@auth0/auth0-react";
import * as Sentry from "@sentry/react";
import type React from "react";
import { useState } from "react";

import "./lib/logger";
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from "react-router";
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
    <html lang="en" className="h-full">
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
      <body className="bg-base text-base-content h-full">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {}

export default function Root() {
  return (
    <Auth0Provider
      domain="pob-web.us.auth0.com"
      clientId="o8TOT9gDHzztbdIIIV54HxlfaSMFYTeH"
      legacySameSiteCookie={false}
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
      cacheLocation={"localstorage"}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "https://pob.cool/api",
        scope: "openid profile email offline_access",
      }}
    >
      <Outlet />
    </Auth0Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (error && error instanceof Error) {
    stack = error.stack;
  }

  const [copy, setCopy] = useState("copy");

  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="font-semibold text-error">{message}</p>
        <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight sm:text-7xl">{details}</h1>
        {/*<p className="mt-6 text-pretty text-lg font-medium text-base-content/50 sm:text-xl/8">{details}</p>*/}
        {stack && (
          <div className="grid *:[grid-area:1/1] mt-6">
            <pre className="p-4 overflow-x-auto prose max-w-full text-left bg-neutral text-neutral-content">
              <code>{stack}</code>
            </pre>
            <div className="tooltip tooltip-left tooltip-accent m-2 [justify-self:right] self-start" data-tip={copy}>
              <button
                type="button"
                className="btn btn-square btn-sm btn-neutral"
                aria-label="Copy to clipboard"
                onClick={async () => {
                  await navigator.clipboard.writeText(stack);
                  setCopy("copied");
                  setTimeout(() => setCopy("copy"), 2000);
                }}
              >
                <svg className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                  <title>Copy to clipboard</title>
                  <path d="M 16 3 C 14.742188 3 13.847656 3.890625 13.40625 5 L 6 5 L 6 28 L 26 28 L 26 5 L 18.59375 5 C 18.152344 3.890625 17.257813 3 16 3 Z M 16 5 C 16.554688 5 17 5.445313 17 6 L 17 7 L 20 7 L 20 9 L 12 9 L 12 7 L 15 7 L 15 6 C 15 5.445313 15.445313 5 16 5 Z M 8 7 L 10 7 L 10 11 L 22 11 L 22 7 L 24 7 L 24 26 L 8 26 Z" />{" "}
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link to="/" className="btn btn-primary">
            Go back home
          </Link>
          <a href="https://github.com/atty303/pob-web/issues" className="btn btn-sm btn-neutral btn-ghost">
            File an issue <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}
