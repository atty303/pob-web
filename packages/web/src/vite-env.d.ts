/// <reference types="vite/client" />
declare const APP_VERSION: string;
declare const __SENTRY_RELEASE__: string | undefined;
declare const __VERSION_URL__: string;
declare const __ASSET_PREFIX__: string;

interface Window {
  __POB_DIAGNOSTICS__?: {
    runId: string;
    snapshot: () => unknown;
  };
  __POB_WEB_TEST__?: {
    getBuildCode: () => Promise<string>;
  };
}
