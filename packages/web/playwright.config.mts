import { defineConfig } from "@playwright/test";

const sentryDsn = Deno.env.get("SENTRY_LIVE_TEST") === "1"
  ? Deno.env.get("SENTRY_LIVE_DSN")
  : "https://public@o0.ingest.sentry.io/0";

if (!sentryDsn) throw new Error("SENTRY_LIVE_DSN is required when SENTRY_LIVE_TEST=1");

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "firefox-pobb",
      testMatch: "**/build-import.spec.mts",
      grep: /@firefox-pobb/,
      use: { browserName: "firefox" },
    },
    { name: "firefox-sentry", testMatch: "**/sentry-wasm.spec.mts", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "deno task test:e2e:serve",
    wait: { stdout: /Local:\s+(?<dev_server_url>http:\/\/127\.0\.0\.1:\d+\/)/ },
    env: { VITE_SENTRY_DSN: sentryDsn },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
