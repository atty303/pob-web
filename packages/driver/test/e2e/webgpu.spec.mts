import { expect, test } from "../../../../tools/playwright.mts";
import { waitForPoBReady } from "./pob.mts";
import { releases } from "./releases.mts";

test("the glyph atlas renders through WebGPU when available", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGPU coverage uses Chromium");
  const webgpuAvailable = await page.evaluate(() => "gpu" in navigator);
  test.skip(!webgpuAvailable, "WebGPU is unavailable in this browser environment");

  const release = releases[0];
  if (!release) throw new Error("No E2E release is configured");
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await page.goto(`/?game=${release.game}&version=${release.version}&webgpu=true`);
  await waitForPoBReady(page);

  expect(messages.some((message) => message.includes("Using WebGPU backend"))).toBe(true);
  const stats = await page.evaluate(() => window.__POB_TEST__?.renderStats?.glyphAtlas);
  expect(stats?.pages).toBeGreaterThan(0);
  expect(stats?.lookups).toBeGreaterThan(0);
  expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
});
