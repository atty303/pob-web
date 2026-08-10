import { test as base, expect } from "@playwright/test";

export { expect };

export const test = base.extend({
  baseURL: async ({ browserName: _browserName }, use) => {
    const serverURL = process.env.DEV_SERVER_URL;
    if (!serverURL) throw new Error("DEV_SERVER_URL was not captured from the development server output");
    await use(serverURL);
  },
  page: async ({ page }, use) => {
    const remoteAssetRequests: string[] = [];
    await page.route("https://asset.pob.cool/**", async route => {
      remoteAssetRequests.push(route.request().url());
      await route.abort("blockedbyclient");
    });
    await use(page);
    expect(remoteAssetRequests, "browser tests must use locally packed game assets").toEqual([]);
  },
});
