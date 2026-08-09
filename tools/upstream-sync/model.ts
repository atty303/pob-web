import { type Game, isGame } from "../../packages/game/src/index.ts";

export type TestResult = "tested" | "failed";

export type VersionEntry = {
  value: string;
  date: string;
  testResult?: TestResult;
};

export type GameVersions = {
  head: string;
  versions: VersionEntry[];
};

export type Versions = Record<Game, GameVersions>;

export type ReleaseTag = {
  name: string;
  committedDate: string;
};

export type MatrixRelease = VersionEntry & {
  testResult: TestResult;
};

export type MatrixResult = {
  game: Game;
  releases: MatrixRelease[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTestResult(value: unknown): value is TestResult {
  return value === "tested" || value === "failed";
}

function parseVersionEntry(value: unknown): VersionEntry {
  if (!isRecord(value) || typeof value.value !== "string" || typeof value.date !== "string") {
    throw new TypeError("Invalid version entry");
  }
  if (value.testResult !== undefined && !isTestResult(value.testResult)) {
    throw new TypeError(`Invalid test result for ${value.value}`);
  }
  return { value: value.value, date: value.date, ...(value.testResult ? { testResult: value.testResult } : {}) };
}

export function parseVersions(value: unknown): Versions {
  if (!isRecord(value)) throw new TypeError("Invalid version metadata");

  const result = {} as Versions;
  for (const game of ["poe1", "poe2", "le"] as const) {
    const gameValue = value[game];
    if (!isRecord(gameValue) || typeof gameValue.head !== "string" || !Array.isArray(gameValue.versions)) {
      throw new TypeError(`Invalid version metadata for ${game}`);
    }
    result[game] = { head: gameValue.head, versions: gameValue.versions.map(parseVersionEntry) };
  }
  return result;
}

export function parseMatrixResult(value: unknown): MatrixResult {
  if (!isRecord(value) || typeof value.game !== "string" || !isGame(value.game) || !Array.isArray(value.releases)) {
    throw new TypeError("Invalid matrix result");
  }
  const releases = value.releases.map(parseVersionEntry);
  if (releases.some((release) => !release.testResult)) {
    throw new TypeError(`Matrix result for ${value.game} has an untested release`);
  }
  return { game: value.game, releases: releases as MatrixRelease[] };
}

export function findNewTags(latestTags: readonly ReleaseTag[], knownVersions: readonly VersionEntry[]): ReleaseTag[] {
  const known = new Set(knownVersions.map((version) => version.value));
  return latestTags.filter((tag) => !known.has(tag.name));
}

export function mergeMatrixResults(versions: Versions, matrixResults: readonly MatrixResult[]): Versions {
  const merged = structuredClone(versions);
  const seenGames = new Set<Game>();

  for (const result of matrixResults) {
    if (seenGames.has(result.game)) throw new TypeError(`Duplicate matrix result for ${result.game}`);
    seenGames.add(result.game);

    const gameVersions = merged[result.game];
    const existing = new Set(gameVersions.versions.map((version) => version.value));
    const newReleases = result.releases.filter((release) => !existing.has(release.value));
    const resultsByVersion = new Map(result.releases.map((release) => [release.value, release]));
    gameVersions.versions = [
      ...newReleases,
      ...gameVersions.versions.map((version) => resultsByVersion.get(version.value) ?? version),
    ];

    const newestTested = result.releases.find((release) => release.testResult === "tested");
    if (newestTested) gameVersions.head = newestTested.value;
  }

  return merged;
}
