import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/integration",
  testMatch: "zenfs-browser.spec.mts",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
  ],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "deno task test:e2e:serve --port 4174 --strictPort",
    url: "http://127.0.0.1:4174/test/integration/fixtures/zenfs.html",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
