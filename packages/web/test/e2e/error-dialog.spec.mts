import { expect, test } from "../../../../tools/playwright.mts";

const versions = JSON.parse(Deno.readTextFileSync(new URL("../../../../version.json", import.meta.url))) as {
  poe2: { head: string };
};
const poe2Head = versions.poe2.head;

test("expected asset failures show recovery details without offering a pob.cool report", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => {} },
    });
  });
  await page.route("https://*.ingest.sentry.io/**", (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(
    "**/games/poe2/versions/*/root.zip",
    (route) => route.fulfill({ status: 503, contentType: "text/plain", body: "temporarily unavailable" }),
  );

  await page.goto("/poe2");

  await expect(page.getByRole("heading", { name: "Path of Building couldn't start" })).toBeVisible();
  await expect(page.getByText("Diagnostic information about this error was collected automatically.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Report a pob.cool issue" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Report a pob.cool issue" })).toHaveCount(0);

  await page.getByText("Technical details").click();
  await page.getByRole("button", { name: "Copy Diagnostics" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
});

test("pob.cool reporting is gated by an upstream reproduction check", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          if (sessionStorage.getItem("reject-diagnostics-copy")) throw new Error("Clipboard denied");
          sessionStorage.setItem("copied-diagnostics", text);
        },
      },
    });
  });
  await page.route("https://*.ingest.sentry.io/**", (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(
    "**/games/poe2/versions/*/root.zip",
    (route) => route.fulfill({ status: 200, contentType: "application/zip", body: "not a zip archive" }),
  );

  await page.goto("/poe2");

  await expect(page.getByRole("heading", { name: "Path of Building encountered an error" })).toBeVisible();
  await expect(page.getByText("Before reporting this to pob.cool")).toBeVisible();
  await expect(page.getByRole("link", { name: poe2Head })).toHaveAttribute(
    "href",
    `https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/releases/tag/${poe2Head}`,
  );
  await expect(page.getByRole("button", { name: "Report a pob.cool issue" })).toBeDisabled();

  await page.getByLabel("I confirmed this issue does not occur in the original application.").check();

  await expect(page.getByText("Copy the diagnostics, then paste them into the GitHub issue.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Report a pob.cool issue" })).toBeDisabled();

  await page.getByRole("button", { name: "Copy Diagnostics" }).click();

  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("copied-diagnostics"))).toContain(
    "## Diagnostics",
  );
  await expect(page.getByRole("link", { name: "Report a pob.cool issue" })).toHaveAttribute(
    "href",
    "https://github.com/atty303/pob-web/issues/new",
  );

  await page.evaluate(() => sessionStorage.setItem("reject-diagnostics-copy", "true"));
  await page.getByRole("button", { name: "Copied" }).click();

  await expect(page.getByRole("button", { name: "Copy failed — try again" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Report a pob.cool issue" })).toBeDisabled();
});
