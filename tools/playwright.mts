import { expect, test as base } from "@playwright/test";

export { expect };

export const test = base.extend({
  baseURL: async ({ browserName: _browserName }, use) => {
    const serverURL = Deno.env.get("DEV_SERVER_URL");
    if (!serverURL) throw new Error("DEV_SERVER_URL was not captured from the development server output");
    await use(serverURL);
  },
  page: async ({ page }, use, testInfo) => {
    const remoteAssetRequests: string[] = [];
    const consoleMessages: Array<{
      type: string;
      text: string;
      location: { url: string; lineNumber: number; columnNumber: number };
    }> = [];
    const pageErrors: Array<{ message: string; stack?: string }> = [];
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error") {
        consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
      }
    });
    page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
    await page.route("https://asset.pob.cool/**", async (route) => {
      remoteAssetRequests.push(route.request().url());
      await route.abort("blockedbyclient");
    });
    let fixtureFailed = false;
    try {
      await use(page);
      expect(remoteAssetRequests, "browser tests must use locally packed game assets").toEqual([]);
    } catch (error) {
      fixtureFailed = true;
      throw error;
    } finally {
      if (fixtureFailed || testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach("browser-diagnostics", {
          body: JSON.stringify({ consoleMessages, pageErrors, remoteAssetRequests }, null, 2),
          contentType: "application/json",
        });
      }
    }
  },
});
