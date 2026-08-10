import { spawnSync } from "node:child_process";
import { headRelease, resolveDriverReleases } from "./e2e-releases.ts";

const suite = process.argv[2];
const releases = (() => {
  switch (suite) {
    case "driver":
      return resolveDriverReleases().releases;
    case "web":
      return [headRelease("poe2")];
    default:
      throw new Error(`Unsupported E2E suite: ${suite ?? "<missing>"}`);
  }
})();

for (const release of releases) {
  const result = spawnSync("mise", ["run", "pack", "--game", release.game, "--tag", release.version], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
