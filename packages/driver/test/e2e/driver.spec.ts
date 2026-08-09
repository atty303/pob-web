import { expect, test } from "@playwright/test";
import { releases } from "./releases";

for (const release of releases) {
  test(`${release.game} ${release.version} loads items, renders, and zooms`, async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    let webgl2Backend = false;

    page.on("console", message => {
      consoleMessages.push(message.text());
      if (message.type() === "error") consoleErrors.push(message.text());
      if (message.text().includes("Using WebGL2 backend")) webgl2Backend = true;
    });
    page.on("pageerror", error => pageErrors.push(error.message));

    await page.goto(`/?game=${release.game}&version=${release.version}`);
    await page.waitForFunction(
      () =>
        window.__POB_TEST__?.started === true &&
        window.__POB_TEST__.frameCount > 0 &&
        (window.__POB_TEST__.renderStats?.layerStats.reduce(
          (count, layer) => count + layer.drawImageCount + layer.drawImageQuadCount + layer.drawStringCount,
          0,
        ) ?? 0) > 0,
    );

    let itemLoadPoll = 0;
    await expect
      .poll(
        async () => {
          await page.mouse.move(10 + (itemLoadPoll++ % 2), 10);
          const state = await page.evaluate(() => window.__POB_TEST__);
          if (state?.errors.length) {
            throw new Error(`Driver reported errors while loading items:\n${state.errors.join("\n")}`);
          }
          return {
            uniquesLoaded: consoleMessages.includes("Uniques loaded"),
            raresLoaded: consoleMessages.includes("Rares loaded"),
          };
        },
        { timeout: 45_000 },
      )
      .toEqual({ uniquesLoaded: true, raresLoaded: true });

    await page.waitForTimeout(3_000);

    const state = await page.evaluate(() => window.__POB_TEST__);
    expect(state?.errors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(state?.title).not.toBe("");
    expect(webgl2Backend).toBe(true);

    const canvas = page.locator("canvas");
    await expect(canvas).toHaveCount(1);
    const dimensions = await canvas.evaluate(element => {
      const transferredCanvas = element as HTMLCanvasElement;
      return { width: transferredCanvas.width, height: transferredCanvas.height };
    });
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Zoom Controls" }).click();
    const slider = page.getByRole("slider");
    await slider.fill("1.2");
    await expect(slider).toHaveValue("1.2");
    await expect.poll(() => canvas.evaluate(element => element.style.transform)).toContain("scale(1.2)");

    const finalState = await page.evaluate(() => window.__POB_TEST__);
    expect(finalState?.errors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test("the current build exports and reloads through the Lua runtime", async ({ page }) => {
  await page.goto("/?game=poe1&version=v2.66.2");
  await page.waitForFunction(() => window.__POB_TEST__?.started === true);

  const initialCode = await page.evaluate(() => {
    const getBuildCode = window.__POB_TEST__?.getBuildCode;
    if (!getBuildCode) throw new Error("getBuildCode test hook is unavailable");
    return getBuildCode();
  });
  if (!initialCode) throw new Error("getBuildCode returned no code");
  await page.evaluate(code => {
    const loadBuildFromCode = window.__POB_TEST__?.loadBuildFromCode;
    if (!loadBuildFromCode) throw new Error("loadBuildFromCode test hook is unavailable");
    return loadBuildFromCode(code);
  }, initialCode);
  const roundTrippedCode = await page.evaluate(() => window.__POB_TEST__?.getBuildCode?.());
  expect(roundTrippedCode).toMatch(/^[A-Za-z0-9_=-]+$/);
  expect(roundTrippedCode).not.toBe(initialCode);
  expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
});
