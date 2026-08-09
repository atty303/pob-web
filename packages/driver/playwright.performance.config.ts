import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: "test/performance",
  repeatEach: 5,
  reporter: "line",
  timeout: 90_000,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
