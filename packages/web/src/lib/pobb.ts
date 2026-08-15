import type { Game } from "pob-game";

const POBB_ORIGIN = "https://pobb.in";
const POBB_ID = /^[A-Za-z0-9_-]{5,90}$/;

export type PobbBuild = Readonly<{
  content: string;
  game: Extract<Game, "poe1" | "poe2">;
}>;

type PobbResponse = {
  content?: unknown;
  metadata?: { game_version?: unknown };
};

type PobbDownload = {
  body?: unknown;
  error?: unknown;
  status?: unknown;
};

const proxyBuilds = new Map<string, Promise<PobbBuild | undefined>>();

export function pobbJsonUrl(value: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.origin !== POBB_ORIGIN || url.search || url.hash || url.username || url.password) return undefined;

  const id = url.pathname.slice(1);
  if (!POBB_ID.test(id)) return undefined;

  return `${POBB_ORIGIN}/${id}/json`;
}

export function parsePobbBuild(value: unknown): PobbBuild | undefined {
  const response = value as PobbResponse | undefined;
  if (!response || typeof response !== "object" || typeof response.content !== "string" || response.content === "") {
    return undefined;
  }

  switch (response.metadata?.game_version) {
    case "One":
      return { content: response.content, game: "poe1" };
    case "Two":
      return { content: response.content, game: "poe2" };
    default:
      return undefined;
  }
}

export async function loadPobbBuild(
  value: string,
  request: (url: string) => Promise<PobbDownload>,
): Promise<PobbBuild | undefined> {
  const url = pobbJsonUrl(value);
  if (!url) return undefined;

  const response = await request(url);
  if (response.error) throw new Error(String(response.error));
  if (typeof response.status !== "number" || response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to download POBb.in build (${String(response.status)})`);
  }
  if (typeof response.body !== "string") throw new Error("Invalid POBb.in build response");

  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("Invalid POBb.in build response");
  }
  const build = parsePobbBuild(payload);
  if (!build) throw new Error("Invalid POBb.in build response");
  return build;
}

export async function loadPobbBuildViaProxy(
  value: string,
  headers: Record<string, string> = {},
): Promise<PobbBuild | undefined> {
  const url = pobbJsonUrl(value);
  if (!url) return undefined;

  let build = proxyBuilds.get(url);
  if (!build) {
    build = loadPobbBuild(value, async () => {
      const response = await fetch("/api/fetch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, headers }),
      });
      if (!response.ok) throw new Error(`Failed to download POBb.in build (${response.status})`);
      return (await response.json()) as PobbDownload;
    });
    proxyBuilds.set(url, build);
  }
  return await build;
}
