import { test as base, expect } from "@playwright/test";

export { expect };

export const test = base.extend({
  baseURL: async ({ browserName: _browserName }, use) => {
    const serverURL = process.env.DEV_SERVER_URL;
    if (!serverURL) throw new Error("DEV_SERVER_URL was not captured from the development server output");
    await use(serverURL);
  },
});
