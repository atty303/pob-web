export const games = ["poe1", "poe2", "le"] as const;

export type Game = (typeof games)[number];
type GameData = {
  name: string;
  repository: { owner: string; name: string };
  userDirectory: string;
  cloudflareKvNamespace: string | undefined;
};

export const gameData: Record<Game, GameData> = {
  poe1: {
    name: "Path of Exile 1",
    repository: { owner: "PathOfBuildingCommunity", name: "PathOfBuilding" },
    userDirectory: "Path of Building",
    cloudflareKvNamespace: undefined,
  },
  poe2: {
    name: "Path of Exile 2",
    repository: { owner: "PathOfBuildingCommunity", name: "PathOfBuilding-PoE2" },
    userDirectory: "Path of Building (PoE2)",
    cloudflareKvNamespace: "poe2",
  },
  le: {
    name: "Last Epoch",
    repository: { owner: "Musholic", name: "LastEpochPlanner" },
    userDirectory: "Last Epoch Planner",
    cloudflareKvNamespace: "le",
  },
};

export function isGame(game: string): game is Game {
  return games.includes(game as Game);
}
