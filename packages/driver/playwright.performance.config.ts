import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: "test/performance",
  repeatEach: 3,
  reporter: "line",
  timeout: 90_000,
  projects: [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }],
});
