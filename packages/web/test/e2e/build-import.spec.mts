import { expect, test } from "../../../../tools/playwright.mts";
import { webE2EReleases } from "../../../../tools/e2e-releases.mts";

const POE1_IMPORT_VERSION = webE2EReleases.find(({ game }) => game === "poe1")?.version;
if (!POE1_IMPORT_VERSION) throw new Error("The web E2E releases do not include Path of Exile 1");
const BUILD_URL = "https://pobb.in/pob/e2e-import";
const POBB_BUILD_URL = "https://pobb.in/e2e-import";
const ISSUE_BUILD_URL = "https://pobb.in/vFsqtUswlGGR";
const ISSUE_RAW_URL = "https://pobb.in/pob/vFsqtUswlGGR";
const BUILD_CODE =
  "eJxdUE1PAjEQ_SuTuSsLeNCkLYkEDQfRuKseTdMOS0O3JW1Z_flmcFfR23tv3kcyYvHZeegpZReDxOllhUDBROtCK_Glubu4xoUST7rsHre3R-f5oMQJgaeevMSrGULRqaXyOvbM3ysE43XOG92RxDdXzA5BZ0PBLn_1TQyE0GkX6mj2VO5TPB4kThF6Rx8P0ZLE5nm1wokSTSICbYrrqT6QYZcSjKAkorPp2c2wvbYS539WWakQQrSUJXLrhGuVqPfO-zzWM6mpDBMDA2dZ4My3W4l1oW4MMf7JDOQscrIqsYxh61oW_r30C-adgW4=";
const ISSUE_BUILD_CODE = Deno.readTextFileSync(new URL("./fixtures/pobb-poe2-v0.5.txt", import.meta.url)).trim();

test("a fixed Path of Exile build imports from a pobb.in URL", async ({ page }) => {
  let buildRequests = 0;
  await page.route(BUILD_URL, (route) => {
    buildRequests += 1;
    return route.fulfill({ status: 200, contentType: "text/plain", body: BUILD_CODE });
  });
  await page.route(
    "**/api/fetch",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "not a JSON build" }),
      }),
  );

  await page.goto(`/poe1/versions/${POE1_IMPORT_VERSION}#=${POBB_BUILD_URL}`);

  await expect.poll(() => page.title(), { timeout: 45_000 }).toBe("Imported build (Witch) - Path of Building");
  expect(buildRequests).toBe(1);
  await expect(page.getByText("Critical Error Occurred")).toHaveCount(0);
});

test("a current POBb.in link imports after selecting its game @firefox-pobb", async ({ browserName, page }) => {
  let proxyRequests = 0;
  const rawRequests: Array<{ method: string; userAgent: string }> = [];
  await page.route(ISSUE_RAW_URL, (route) => {
    rawRequests.push({
      method: route.request().method(),
      userAgent: route.request().headers()["user-agent"] ?? "",
    });
    return route.fulfill({
      status: 200,
      contentType: "text/plain",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: ISSUE_BUILD_CODE,
    });
  });
  await page.route("**/api/fetch", async (route) => {
    proxyRequests += 1;
    const payload = JSON.parse(route.request().postData() ?? "{}") as { url?: string };
    expect(payload.url).toBe(`${ISSUE_BUILD_URL}/json`);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        body: JSON.stringify({ content: ISSUE_BUILD_CODE, metadata: { game_version: "Two" } }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    });
  });

  const poe2RootZip = page.waitForRequest((request) => request.url().includes("/games/poe2/versions/"));
  await page.goto(`/poe1#=${ISSUE_BUILD_URL}`);

  await poe2RootZip;
  await expect(page).toHaveURL(new RegExp(`/poe2#=${ISSUE_BUILD_URL}$`));
  await expect.poll(() => page.title(), { timeout: 45_000 }).toBe(
    "Imported build (Gemling Legionnaire) - Path of Building (PoE2)",
  );
  expect(proxyRequests).toBeGreaterThanOrEqual(1);
  expect(rawRequests).toHaveLength(1);
  expect(rawRequests[0]?.method).toBe("GET");
  expect(rawRequests[0]?.userAgent).not.toMatch(/^Path of Building\//);
  if (browserName === "firefox") expect(rawRequests[0]?.userAgent).toContain("Firefox/");

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  const dimensions = await canvas.evaluate((element) => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Performance overlay").check();
  const totalDraws = page.getByText(/^Total draws: \d+$/);
  await expect(totalDraws).toBeVisible();
  await expect.poll(async () => Number((await totalDraws.textContent())?.split(": ")[1] ?? 0)).toBeGreaterThan(0);
  await expect(page.getByText("Critical Error Occurred")).toHaveCount(0);
});

test("a failed direct pobb.in request falls back to the fetch proxy", async ({ page }) => {
  let directRequests = 0;
  let proxyRequests = 0;
  await page.route(BUILD_URL, (route) => {
    directRequests += 1;
    return route.fulfill({ status: 503, contentType: "text/plain", body: "edge unavailable" });
  });
  await page.route("**/api/fetch", async (route) => {
    proxyRequests += 1;
    const payload = JSON.parse(route.request().postData() ?? "{}") as { url?: string };
    if (payload.url === `${POBB_BUILD_URL}/json`) {
      return await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "not a JSON build" }),
      });
    }
    expect(payload.url).toBe(BUILD_URL);
    return await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        body: BUILD_CODE,
        headers: { "content-type": "text/plain" },
        status: 200,
      }),
    });
  });

  await page.goto(`/poe1/versions/${POE1_IMPORT_VERSION}#=${POBB_BUILD_URL}`);

  await expect.poll(() => page.title(), { timeout: 45_000 }).toBe("Imported build (Witch) - Path of Building");
  expect({ directRequests, proxyRequests }).toEqual({ directRequests: 1, proxyRequests: 2 });
});

test("an unhandled build download subscript failure reaches the driver error dialog", async ({ page }) => {
  let wasmRequests = 0;
  await page.route(BUILD_URL, (route) => route.fulfill({ status: 200, contentType: "text/plain", body: BUILD_CODE }));
  await page.route(
    "**/api/fetch",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "not a JSON build" }),
      }),
  );
  await page.route("**/driver.wasm", async (route) => {
    wasmRequests += 1;
    if (wasmRequests === 1) {
      await route.continue();
    } else {
      await route.fulfill({ status: 200, contentType: "application/wasm", body: "invalid wasm" });
    }
  });

  await page.goto(`/poe1/versions/${POE1_IMPORT_VERSION}#=${POBB_BUILD_URL}`);

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Path of Building encountered an error" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(dialog).toContainText("Subscript failed:");
  expect(wasmRequests).toBe(2);
});
