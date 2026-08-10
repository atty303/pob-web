import * as Sentry from "@sentry/react";
import { Driver, type FilesystemConfig } from "pob-driver/src/js/driver";
import versions from "../../../../../version.json";
import { registerSentryWorker, wasmIntegrations } from "../../../src/lib/sentry";

declare const __ASSET_PREFIX__: string;

declare global {
  interface Window {
    __triggerSentryWasmTest?: () => Promise<string>;
  }
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: wasmIntegrations,
});

const driver = new Driver(
  "release",
  `${__ASSET_PREFIX__}/games/poe2/versions/${versions.poe2.head}`,
  {
    onError: error => {
      throw error;
    },
    onFrame: () => {},
    onFetch: async (url, headers, body) => {
      const response = await fetch("/api/fetch", {
        method: "POST",
        body: JSON.stringify({ url, headers, body }),
      });
      return await response.json();
    },
    onTitleChange: () => {},
  },
  { onWorkerCreated: registerSentryWorker },
);

const filesystemConfig: FilesystemConfig = {
  userDirectory: "Path of Building",
  cloudflareKvPrefix: "/api/kv",
  cloudflareKvAccessToken: undefined,
  cloudflareKvUserNamespace: undefined,
};

await driver.start(filesystemConfig);

window.__triggerSentryWasmTest = async () => {
  try {
    await driver.triggerSentryTestCrash();
    throw new Error("Expected the intentional WebAssembly trap");
  } catch (error) {
    const eventId = Sentry.captureException(error, { tags: { intentional_test: "true", runtime: "wasm" } });
    await Sentry.flush(2_000);
    return eventId;
  } finally {
    driver.destory();
  }
};
