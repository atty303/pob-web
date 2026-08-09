import { expect, test } from "@playwright/test";

const releases = [
  { game: "poe1", version: "v2.67.2" },
  { game: "poe2", version: "v0.23.1" },
  { game: "le", version: "v0.12.0" },
] as const;

for (const release of releases) {
  test(`${release.game} ${release.version} starts, renders, and zooms`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    let webgl2Backend = false;

    page.on("console", message => {
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

    const state = await page.evaluate(() => window.__POB_TEST__);
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
