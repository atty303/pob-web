import { expect, test } from "@playwright/test";

test("the landing page shows compatibility results and starts a rendered Path of Exile 2 session", async ({ page }) => {
  await page.route("https://*.ingest.sentry.io/**", route => route.fulfill({ status: 200, json: {} }));

  await page.route("**/version.json", route =>
    route.fulfill({
      json: {
        poe1: {
          head: "v2.66.2",
          versions: [
            { value: "v2.66.2", date: "2026-01-03T00:00:00Z", testResult: "tested" },
            { value: "failed", date: "2026-01-02T00:00:00Z", testResult: "failed" },
            { value: "legacy", date: "2026-01-01T00:00:00Z" },
          ],
        },
        poe2: { head: "v0.23.1", versions: [{ value: "v0.23.1", date: "2026-01-01T00:00:00Z" }] },
        le: { head: "v0.12.0", versions: [{ value: "v0.12.0", date: "2026-01-01T00:00:00Z" }] },
      },
    }),
  );
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let webgl2Backend = false;

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (message.text().includes("Using WebGL2 backend")) webgl2Backend = true;
  });
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.getByRole("link", { name: "Start for Path of Exile 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start for Path of Exile 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start for Last Epoch" })).toBeVisible();
  await expect(page.getByText("Tested", { exact: true })).toBeVisible();
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  await expect(page.getByText("Untested", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Start for Path of Exile 2" }).click();
  await expect(page).toHaveURL(/\/poe2$/);
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible({ timeout: 45_000 });
  await expect.poll(() => page.title()).not.toBe("pob.cool");

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  const dimensions = await canvas.evaluate(element => {
    const transferredCanvas = element as HTMLCanvasElement;
    return { width: transferredCanvas.width, height: transferredCanvas.height };
  });
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Performance overlay").check();
  const totalDraws = page.getByText(/^Total draws: \d+$/);
  await expect(totalDraws).toBeVisible();
  await expect.poll(async () => Number((await totalDraws.textContent())?.split(": ")[1] ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => webgl2Backend).toBe(true);

  await expect(page.getByText("Critical Error Occurred")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
