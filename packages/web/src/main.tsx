import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import * as Sentry from "@sentry/react";
import {Auth0Provider} from "@auth0/auth0-react";

import "./logger";

if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0, //  Capture 100% of the transactions
        // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
        // Session Replay
        replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
        replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Auth0Provider domain="pob-web.us.auth0.com" clientId="o8TOT9gDHzztbdIIIV54HxlfaSMFYTeH" authorizationParams={{
            redirect_uri: window.location.origin,
            audience: "https://pob.cool/api",
        }}>
            <App />
        </Auth0Provider>
    </React.StrictMode>,
)
