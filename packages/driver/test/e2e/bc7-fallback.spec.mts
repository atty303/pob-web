import { expect, test } from "../../../../tools/playwright.mts";
import { waitForPoBReady } from "./pob.mts";
import { releases } from "./releases.mts";

test("BC7 textures render through the CPU fallback", async ({ page }) => {
  test.skip(Deno.env.get("BPTC_SUPPORT_OVERRIDE") !== "false", "Run through mise run test:e2e:driver:bc7");
  const release = releases[0];
  const decoderResponses: number[] = [];
  const pageErrors: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/texture2ddecoder/")) decoderResponses.push(response.status());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`/?game=${release.game}&version=${release.version}`);
  await waitForPoBReady(page);
  await expect.poll(() => decoderResponses.length).toBeGreaterThanOrEqual(2);
  expect(decoderResponses.every((status) => status === 200 || status === 304)).toBe(true);
  expect(pageErrors).toEqual([]);
  expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
  await expect(page.locator("canvas")).toHaveCount(1);
});
