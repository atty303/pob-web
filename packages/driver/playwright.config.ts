import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { releases } from "./test/e2e/releases";

if (process.env.POB_COOL_ASSET !== "true") {
  const assetRoot = path.resolve(import.meta.dirname, "../packer/r2");
  const missing = releases.filter(
    ({ game, version }) => !fs.existsSync(path.join(assetRoot, "games", game, "versions", version, "root.zip")),
  );
  if (missing.length) {
    const commands = missing.map(({ game, version }) => `mise run pack --game ${game} --tag ${version}`).join("\n");
    throw new Error(`Local driver E2E assets are missing. Pack them first:\n${commands}`);
  }
}

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "npm run test:e2e:serve",
    wait: { stdout: /Local:\s+(?<dev_server_url>http:\/\/127\.0\.0\.1:\d+\/)/ },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
