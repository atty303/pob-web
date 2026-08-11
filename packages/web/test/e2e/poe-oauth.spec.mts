import { expect, test } from "../../../../tools/playwright.mts";

test("logout requires confirmation before navigating through Auth0", async ({ page }) => {
  await page.goto("/auth/poe-popup");

  const result = await page.evaluate(async () => {
    const modulePath = "/src/lib/auth.ts";
    const { confirmAndLogout } = await import(/* @vite-ignore */ modulePath) as typeof import("../../src/lib/auth.ts");
    const calls: unknown[] = [];
    const auth0 = {
      logout: (options?: unknown) => {
        calls.push(options);
        return Promise.resolve();
      },
    };

    Object.defineProperty(window, "confirm", { configurable: true, value: () => false });
    const cancelled = confirmAndLogout(auth0);
    Object.defineProperty(window, "confirm", { configurable: true, value: () => true });
    const confirmed = confirmAndLogout(auth0);

    return { cancelled, confirmed, calls, origin: window.location.origin };
  });

  expect(result.cancelled).toBe(false);
  expect(result.confirmed).toBe(true);
  expect(result.calls).toEqual([{ logoutParams: { returnTo: result.origin } }]);
});

test("the PoE OAuth redirect helper is separated from the isolated PoB window", async ({ page }) => {
  await page.goto("/auth/poe-popup");

  await expect(page.getByText("Invalid Path of Exile authorization request")).toBeVisible();
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(false);
});

test("the PoE OAuth popup transport handles success, denial, blocking, and timeout", async ({ page }) => {
  await page.goto("/auth/poe-popup");

  expect(await runPopup(page, "success", false)).toEqual({
    result: "mock-auth0-token",
    force: null,
    closeCalls: 0,
  });
  expect(await runPopup(page, "success", true)).toEqual({
    result: "mock-auth0-token",
    force: "1",
    closeCalls: 0,
  });
  await expect(runPopup(page, "denied", false)).rejects.toThrow("The user denied access to your application");
  await expect(runPopup(page, "blocked", false)).rejects.toThrow("Unable to open the PoE authorization window");
  await expect(runPopup(page, "timeout", false, true)).resolves.toEqual({
    error: "PoE authorization window timed out",
    closeCalls: 1,
  });
});

async function runPopup(
  page: import("@playwright/test").Page,
  outcome: "success" | "denied" | "blocked" | "timeout",
  forceAuthorization: boolean,
  captureError = false,
) {
  return await page.evaluate(
    async ({ outcome, forceAuthorization, captureError }) => {
      const modulePath = "/src/lib/poe-oauth.ts";
      const { authorizePoeWithRedirect } = await import(
        /* @vite-ignore */ modulePath
      ) as typeof import("../../src/lib/poe-oauth.ts");
      let popupUrl: URL | undefined;
      let closeCalls = 0;
      Object.defineProperty(window, "open", {
        configurable: true,
        value: (url: string | URL) => {
          popupUrl = new URL(String(url));
          if (outcome === "blocked") return null;
          if (outcome !== "timeout") {
            const channelName = popupUrl.searchParams.get("channel");
            if (!channelName) throw new Error("OAuth popup URL did not contain a channel");
            window.setTimeout(() => {
              const channel = new BroadcastChannel(channelName);
              channel.postMessage(
                outcome === "success"
                  ? { accessToken: "mock-auth0-token" }
                  : { error: "The user denied access to your application" },
              );
              channel.close();
            }, 0);
          }
          return { close: () => closeCalls++ } as unknown as Window;
        },
      });
      try {
        const result = await authorizePoeWithRedirect(forceAuthorization, 20);
        return { result, force: popupUrl?.searchParams.get("force") ?? null, closeCalls };
      } catch (error) {
        if (!captureError) throw error;
        return { error: error instanceof Error ? error.message : String(error), closeCalls };
      }
    },
    { outcome, forceAuthorization, captureError },
  );
}
