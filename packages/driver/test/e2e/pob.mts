import type { Page } from "@playwright/test";

export async function waitForPoBReady(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    window.__POB_TEST__?.started === true &&
    (window.__POB_TEST__.renderStats?.layerStats.reduce(
        (count, layer) => count + layer.drawImageCount + layer.drawImageQuadCount + layer.drawStringCount,
        0,
      ) ?? 0) > 0
  );
}

export async function clickPoBAndWaitForInput(
  page: Page,
  position: { x: number; y: number },
  button: "left" | "right" = "left",
): Promise<void> {
  await page.mouse.move(position.x, position.y);
  await page.mouse.down({ button });
  await waitForPoBInput(page);
  await page.mouse.up({ button });
  await waitForPoBInput(page);
}

export async function typePoB(page: Page, text: string): Promise<void> {
  for (const key of text) {
    await page.keyboard.down(key);
    await waitForPoBInput(page);
    await page.keyboard.up(key);
    await waitForPoBInput(page);
  }
}

async function waitForPoBInput(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const flushInput = window.__POB_TEST__?.flushInput;
    if (!flushInput) throw new Error("flushInput test hook is unavailable");
    await flushInput();
  });
}
