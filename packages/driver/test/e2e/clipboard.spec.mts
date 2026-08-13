import { expect, test } from "../../../../tools/playwright.mts";
import { clickPoBAndWaitForInput, typePoB, waitForPoBReady } from "./pob.mts";
import { releases, targeted } from "./releases.mts";

const TREE_SEARCH = { x: 450, y: 885 };
const TREE_TAB = { x: 40, y: 96 };

test.describe("clipboard", () => {
  test.skip(targeted, "Clipboard round trips only run in the complete compatibility suite");

  test("physical clipboard text round-trips through the PoB tree search", async ({ page }) => {
    await installClipboardWriteDouble(page);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await openTreeSearch(page);

    const inputSink = page.locator("canvas").locator("..");
    await expect(inputSink).toHaveAttribute("contenteditable", "true");
    const initialDOM = await inputSink.evaluate((element) => ({
      childElementCount: element.childElementCount,
      textContent: element.textContent,
    }));

    const token = `pobclipboard${Date.now()}`;
    await page.evaluate(() => {
      (globalThis as typeof globalThis & { __PASTED_TEXT__?: string }).__PASTED_TEXT__ = undefined;
      document.addEventListener(
        "paste",
        (event) => {
          (globalThis as typeof globalThis & { __PASTED_TEXT__?: string }).__PASTED_TEXT__ = event.clipboardData
            ?.getData("text/plain");
        },
        { capture: true, once: true },
      );
    });
    await writeSystemClipboard(page, token);
    await clickPoBAndWaitForInput(page, TREE_SEARCH);
    const pasteFrame = await currentDriverFrame(page);
    await page.keyboard.press("Control+V");
    await waitForDriverFrames(page, pasteFrame, 1);
    expect(
      await page.evaluate(() => (globalThis as typeof globalThis & { __PASTED_TEXT__?: string }).__PASTED_TEXT__),
    ).toBe(token);
    await page.getByRole("button", { name: "Toggle Virtual Keyboard" }).click();
    await page.getByRole("button", { name: "Ctrl", exact: true }).click();
    await page.getByRole("button", { name: "A", exact: true }).click();
    await page.getByRole("button", { name: "C", exact: true }).click();
    await flushPoBInput(page);

    await expect.poll(() =>
      page.evaluate(() => (globalThis as typeof globalThis & { __CLIPBOARD_WRITE__?: string }).__CLIPBOARD_WRITE__)
    ).toBe(token);
    expect(
      await inputSink.evaluate((element) => ({
        childElementCount: element.childElementCount,
        textContent: element.textContent,
      })),
    ).toEqual(initialDOM);
    expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("virtual keyboard text round-trips through the PoB tree search", async ({ page }) => {
    await installClipboardDouble(page);
    await openTreeSearch(page);

    const token = `pobvirtualclipboard${Date.now()}`;
    await page.evaluate((text) => {
      (globalThis as typeof globalThis & { __CLIPBOARD_TEXT__: string }).__CLIPBOARD_TEXT__ = text;
    }, token);
    await page.getByRole("button", { name: "Toggle Virtual Keyboard" }).click();
    await page.getByRole("button", { name: "Ctrl", exact: true }).click();
    await page.getByRole("button", { name: "V", exact: true }).click();
    await flushPoBInput(page);
    const pasteFrame = await currentDriverFrame(page);
    await waitForDriverFrames(page, pasteFrame, 1);

    await page.evaluate(() => {
      (globalThis as typeof globalThis & { __CLIPBOARD_TEXT__: string }).__CLIPBOARD_TEXT__ = "copy-not-observed";
    });
    await page.getByRole("button", { name: "A", exact: true }).click();
    await page.getByRole("button", { name: "C", exact: true }).click();
    await flushPoBInput(page);

    await expect.poll(() =>
      page.evaluate(() => (globalThis as typeof globalThis & { __CLIPBOARD_TEXT__: string }).__CLIPBOARD_TEXT__)
    ).toBe(token);
    expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
  });

  test("physical typing reaches the PoB tree search", async ({ page }) => {
    await installClipboardWriteDouble(page);
    await openTreeSearch(page);

    const token = `physicaltyping${Date.now()}@€`;
    await typePoB(page, token.slice(0, -2));
    await dispatchModifiedCharacter(page, "@", { altKey: true });
    await dispatchModifiedCharacter(page, "€", { altKey: true, ctrlKey: true, altGraph: true });
    await page.getByRole("button", { name: "Toggle Virtual Keyboard" }).click();
    await page.getByRole("button", { name: "Ctrl", exact: true }).click();
    await page.getByRole("button", { name: "A", exact: true }).click();
    await page.getByRole("button", { name: "C", exact: true }).click();
    await flushPoBInput(page);

    await expect.poll(() =>
      page.evaluate(() => (globalThis as typeof globalThis & { __CLIPBOARD_WRITE__?: string }).__CLIPBOARD_WRITE__)
    ).toBe(token);
    expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
  });

  test("a denied right-click paste is non-fatal", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          readText: () => {
            (globalThis as typeof globalThis & { __CLIPBOARD_READ_ATTEMPTED__?: boolean })
              .__CLIPBOARD_READ_ATTEMPTED__ = true;
            return Promise.reject(new DOMException("denied", "NotAllowedError"));
          },
          writeText: () => Promise.resolve(),
        },
      });
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await openTreeSearch(page);

    await clickPoBAndWaitForInput(page, TREE_SEARCH, "right");
    await expect.poll(() =>
      page.evaluate(() =>
        (globalThis as typeof globalThis & { __CLIPBOARD_READ_ATTEMPTED__?: boolean })
          .__CLIPBOARD_READ_ATTEMPTED__
      )
    ).toBe(true);

    expect((await page.evaluate(() => window.__POB_TEST__?.errors)) ?? []).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

async function openTreeSearch(page: import("@playwright/test").Page): Promise<void> {
  await openPoB(page);
  await clickPoBAndWaitForInput(page, TREE_TAB);
  await clickPoBAndWaitForInput(page, TREE_SEARCH);
}

async function openPoB(page: import("@playwright/test").Page): Promise<void> {
  const release = releases.find(({ game }) => game === "poe1");
  if (!release) throw new Error("The default E2E releases do not include Path of Exile 1");
  await page.goto(`/?game=${release.game}&version=${release.version}`);
  await waitForPoBReady(page);
}

async function writeSystemClipboard(page: import("@playwright/test").Page, text: string): Promise<void> {
  const probe = page.locator("#clipboard-probe");
  await page.evaluate((value) => {
    const textarea = document.createElement("textarea");
    textarea.id = "clipboard-probe";
    textarea.value = value;
    document.body.appendChild(textarea);
  }, text);
  await probe.selectText();
  await page.keyboard.press("Control+C");
  await probe.evaluate((element) => element.remove());
}

async function currentDriverFrame(page: import("@playwright/test").Page): Promise<number> {
  return (await page.evaluate(() => window.__POB_TEST__?.frameCount)) ?? 0;
}

async function flushPoBInput(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    const flushInput = window.__POB_TEST__?.flushInput;
    if (!flushInput) throw new Error("flushInput test hook is unavailable");
    await flushInput();
  });
}

async function waitForDriverFrames(
  page: import("@playwright/test").Page,
  initial: number,
  count: number,
): Promise<void> {
  await page.waitForFunction(
    ({ initial, count }) => (window.__POB_TEST__?.frameCount ?? 0) >= initial + count,
    { initial, count },
  );
}

async function dispatchModifiedCharacter(
  page: import("@playwright/test").Page,
  key: string,
  modifiers: { altKey?: boolean; ctrlKey?: boolean; altGraph?: boolean },
): Promise<void> {
  await page.evaluate(
    async ({ key, altKey, ctrlKey, altGraph }) => {
      const inputSink = document.querySelector("canvas")?.parentElement;
      if (!inputSink) throw new Error("The input sink is unavailable");
      const event = new KeyboardEvent("keydown", {
        key,
        altKey,
        ctrlKey,
        bubbles: true,
        cancelable: true,
      });
      if (altGraph) {
        Object.defineProperty(event, "getModifierState", {
          value: (modifier: string) => modifier === "AltGraph",
        });
      }
      inputSink.dispatchEvent(event);
      inputSink.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
      const flushInput = window.__POB_TEST__?.flushInput;
      if (!flushInput) throw new Error("flushInput test hook is unavailable");
      await flushInput();
    },
    { key, ...modifiers },
  );
}

async function installClipboardDouble(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    const state = globalThis as typeof globalThis & { __CLIPBOARD_TEXT__: string };
    state.__CLIPBOARD_TEXT__ = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: () => Promise.resolve(state.__CLIPBOARD_TEXT__),
        writeText: (text: string) => {
          state.__CLIPBOARD_TEXT__ = text;
          return Promise.resolve();
        },
      },
    });
  });
}

async function installClipboardWriteDouble(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: () => Promise.reject(new Error("The physical paste path must use ClipboardEvent data")),
        writeText: (text: string) => {
          (globalThis as typeof globalThis & { __CLIPBOARD_WRITE__?: string }).__CLIPBOARD_WRITE__ = text;
          return Promise.resolve();
        },
      },
    });
  });
}
