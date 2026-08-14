import { expect, test } from "@playwright/test";

test("Zip root filesystem is readable and immutable", async ({ page }) => {
  await page.goto("/test/integration/fixtures/zenfs.html");
  const result = await page.evaluate(() => window.zenfsIntegration.readRoot());
  expect(result).toEqual({
    text: "root fixture\n",
    binary: [0, 1, 2, 255],
    entries: ["blob.bin", "test.txt"],
    writeError: expect.stringMatching(/read-only file system|E(?:PERM|ROFS)/),
  });
});

test("WebAccess persists file contents and metadata across reload", async ({ page }) => {
  await page.goto("/test/integration/fixtures/zenfs.html");
  await page.evaluate(() => window.zenfsIntegration.clearUser());
  await page.evaluate(() => window.zenfsIntegration.writeUser());
  await page.reload();
  await expect.poll(() => page.evaluate(() => typeof window.zenfsIntegration)).toBe("object");
  expect(await page.evaluate(() => window.zenfsIntegration.readUser())).toEqual({
    text: "0123456789",
    size: 10,
    entries: ["build.xml"],
  });
});
