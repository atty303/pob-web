import type { Page } from "@playwright/test";

export type BuildModel = {
  className: string | null;
  ascendClassName: string | null;
  allocatedNodeCount: number;
};

export type BuildModelExpectation = {
  className: string;
  ascendClassName: string;
  minimumAllocatedNodeCount: number;
};

export const POBB_POE2_V05_EXPECTATION: BuildModelExpectation = {
  className: "Mercenary",
  ascendClassName: "Gemling Legionnaire",
  minimumAllocatedNodeCount: 100,
};

export function matchesBuildModel(model: BuildModel, expected: BuildModelExpectation): boolean {
  return model.className === expected.className &&
    model.ascendClassName === expected.ascendClassName &&
    model.allocatedNodeCount >= expected.minimumAllocatedNodeCount;
}

export async function getCurrentBuildModel(page: Page): Promise<BuildModel> {
  return await page.evaluate(async () => {
    const getBuildCode = window.__POB_WEB_TEST__?.getBuildCode;
    if (!getBuildCode) throw new Error("PoB web test API is unavailable");
    const code = await getBuildCode();

    const base64 = code.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(code.length / 4) * 4, "=");
    const compressed = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
    const xml = await new Response(
      new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate")),
    ).text();
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) throw new Error("PoB exported invalid XML");

    const build = document.querySelector("Build");
    const tree = document.querySelector("Tree");
    const activeSpecIndex = Number(tree?.getAttribute("activeSpec") ?? "1") - 1;
    const specs = tree ? Array.from(tree.querySelectorAll("Spec")) : [];
    const nodes = specs[activeSpecIndex]?.getAttribute("nodes") ?? "";

    return {
      className: build?.getAttribute("className") ?? null,
      ascendClassName: build?.getAttribute("ascendClassName") ?? null,
      allocatedNodeCount: nodes.split(",").filter(Boolean).length,
    };
  });
}
