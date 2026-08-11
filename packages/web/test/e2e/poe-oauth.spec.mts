import { expect, test } from "../../../../tools/playwright.mts";

test("the PoE OAuth redirect helper is separated from the isolated PoB window", async ({ page }) => {
  await page.goto("/auth/poe-popup");

  await expect(page.getByText("Invalid Path of Exile authorization request")).toBeVisible();
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(false);
});
