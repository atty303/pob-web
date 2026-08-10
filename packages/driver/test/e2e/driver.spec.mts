import { expect, test } from "../../../../tools/playwright.mts";
import { waitForPoBReady } from "./pob.mts";
import { releases, targeted } from "./releases.mts";

for (const release of releases) {
  test(`${release.game} ${release.version} loads items, renders, and zooms`, async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    let webgl2Backend = false;

    page.on("console", (message) => {
      consoleMessages.push(message.text());
      if (message.type() === "error") consoleErrors.push(message.text());
      if (message.text().includes("Using WebGL2 backend")) webgl2Backend = true;
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`/?game=${release.game}&version=${release.version}`);
    await waitForPoBReady(page);

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
    const dimensions = await canvas.evaluate((element) => {
      const transferredCanvas = element as HTMLCanvasElement;
      return { width: transferredCanvas.width, height: transferredCanvas.height };
    });
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    const inputSink = canvas.locator("..");
    await inputSink.focus();
    const initialInputLayout = await captureInputLayout(inputSink);
    const navigationEvents = page.evaluate(() =>
      new Promise<Array<{ key: string; defaultPrevented: boolean }>>((resolve) => {
        const events: Array<{ key: string; defaultPrevented: boolean }> = [];
        const onKeyDown = (event: KeyboardEvent) => {
          events.push({ key: event.key, defaultPrevented: event.defaultPrevented });
          if (events.length === 2) {
            document.removeEventListener("keydown", onKeyDown);
            resolve(events);
          }
        };
        document.addEventListener("keydown", onKeyDown);
      })
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    expect(await navigationEvents).toEqual([
      { key: "ArrowLeft", defaultPrevented: true },
      { key: "ArrowRight", defaultPrevented: true },
    ]);
    expect(await captureInputLayout(inputSink)).toEqual(initialInputLayout);

    await page.getByRole("button", { name: "Zoom Controls" }).click();
    const slider = page.getByRole("slider");
    await slider.fill("1.2");
    await expect(slider).toHaveValue("1.2");
    await expect.poll(() => canvas.evaluate((element) => element.style.transform)).toContain("scale(1.2)");

    const finalState = await page.evaluate(() => window.__POB_TEST__);
    expect(finalState?.errors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test("the current build exports and reloads through the Lua runtime", async ({ page }) => {
  test.skip(targeted, "Targeted compatibility checks only run the startup scenario");
  const release = releases.find((candidate) => candidate.game === "poe1");
  if (!release) throw new Error("The default E2E releases do not include Path of Exile 1");
  await page.goto(`/?game=${release.game}&version=${release.version}`);
  await page.waitForFunction(() => window.__POB_TEST__?.started === true);

  const initialCode = await page.evaluate(() => {
    const getBuildCode = window.__POB_TEST__?.getBuildCode;
    if (!getBuildCode) throw new Error("getBuildCode test hook is unavailable");
    return getBuildCode();
  });
  if (!initialCode) throw new Error("getBuildCode returned no code");
  await page.evaluate((code) => {
    const loadBuildFromCode = window.__POB_TEST__?.loadBuildFromCode;
    if (!loadBuildFromCode) throw new Error("loadBuildFromCode test hook is unavailable");
    return loadBuildFromCode(code);
  }, initialCode);
  const roundTrippedCode = await page.evaluate(() => window.__POB_TEST__?.getBuildCode?.());
  expect(roundTrippedCode).toMatch(/^[A-Za-z0-9_=-]+$/);
  expect(roundTrippedCode).not.toBe(initialCode);
  expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
});

test("hidden pages release physical keys but preserve virtual modifiers", async ({ page }) => {
  const release = releases[0];
  if (!release) throw new Error("No E2E release is configured");
  await page.goto(`/?game=${release.game}&version=${release.version}`);
  await page.waitForFunction(() => window.__POB_TEST__?.started === true);

  const canvas = page.locator("canvas");
  await canvas.evaluate((element) => (element.parentElement as HTMLElement).focus());
  await page.keyboard.down("Control");
  await expect.poll(() => page.evaluate(() => window.__POB_TEST__?.pressedKeys)).toContain("CTRL");

  await setVisibilityState(page, "hidden");
  await expect.poll(() => page.evaluate(() => window.__POB_TEST__?.pressedKeys)).not.toContain("CTRL");
  await setVisibilityState(page, "visible");
  await page.keyboard.up("Control");

  await page.getByRole("button", { name: "Toggle Virtual Keyboard" }).click();
  const virtualControl = page.getByRole("button", { name: "Ctrl", exact: true });
  await virtualControl.click();
  await expect(virtualControl).toHaveClass(/pw:btn-primary/);
  await expect.poll(() => page.evaluate(() => window.__POB_TEST__?.pressedKeys)).toContain("CTRL");

  await setVisibilityState(page, "hidden");
  await expect.poll(() => page.evaluate(() => window.__POB_TEST__?.pressedKeys)).toContain("CTRL");
  await expect(virtualControl).toHaveClass(/pw:btn-primary/);

  await setVisibilityState(page, "visible");
  await virtualControl.click();
  await expect.poll(() => page.evaluate(() => window.__POB_TEST__?.pressedKeys)).not.toContain("CTRL");
  expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
});

async function setVisibilityState(
  page: import("@playwright/test").Page,
  state: DocumentVisibilityState,
): Promise<void> {
  await page.evaluate((visibilityState) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: visibilityState });
    document.dispatchEvent(new Event("visibilitychange"));
    if (visibilityState === "visible") {
      Reflect.deleteProperty(document, "visibilityState");
    }
  }, state);
}

async function captureInputLayout(locator: import("@playwright/test").Locator) {
  return await locator.evaluate((inputSink) => {
    const canvas = inputSink.querySelector("canvas");
    if (!canvas) throw new Error("The input sink does not contain a canvas");
    const rect = canvas.getBoundingClientRect();
    return {
      focused: inputSink.ownerDocument.activeElement === inputSink,
      scrollLeft: inputSink.scrollLeft,
      scrollTop: inputSink.scrollTop,
      canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
}
