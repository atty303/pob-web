import { expect, test } from "../../../../tools/playwright";

const WARMUP_FRAMES = 20;
const MEASURED_FRAMES = 200;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

test("steady-state PoE 1 frame time", async ({ page }, testInfo) => {
  await page.goto("/?game=poe1&version=v2.66.2");
  await page.waitForFunction(() => window.__POB_TEST__?.started === true);
  await page.waitForTimeout(10_000);

  const sampleFrames = async (count: number) => {
    await page.evaluate(() => window.__POB_TEST__?.resetFrameSamples());
    for (let index = 0; index < count; index += 1) {
      await page.mouse.move(20 + (index % 2), 20);
      await page.waitForFunction(expected => (window.__POB_TEST__?.frameSamples.length ?? 0) >= expected, index + 1);
    }
    return page.evaluate(() => window.__POB_TEST__?.frameSamples ?? []);
  };

  await sampleFrames(WARMUP_FRAMES);
  const samples = await sampleFrames(MEASURED_FRAMES);
  expect(samples).toHaveLength(MEASURED_FRAMES);

  const frame = median(samples.map(sample => sample.totalTime));
  const renderer = median(samples.map(sample => sample.rendererTime));
  const luaWasm = median(samples.map(sample => sample.totalTime - sample.rendererTime));
  console.log(
    JSON.stringify({ browser: testInfo.project.name, repetition: testInfo.repeatEachIndex, frame, renderer, luaWasm }),
  );
});
