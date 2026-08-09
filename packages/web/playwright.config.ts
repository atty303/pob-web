import { defineConfig } from "@playwright/test";

const sentryDsn =
  process.env.SENTRY_LIVE_TEST === "1" ? process.env.SENTRY_LIVE_DSN : "https://public@o0.ingest.sentry.io/0";

if (!sentryDsn) throw new Error("SENTRY_LIVE_DSN is required when SENTRY_LIVE_TEST=1");

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox-sentry", testMatch: "**/sentry-wasm.spec.ts", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "npm run test:e2e:serve",
    url: "http://127.0.0.1:5174",
    env: { VITE_SENTRY_DSN: sentryDsn },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
