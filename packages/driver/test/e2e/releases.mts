import { resolveDriverReleases } from "../../../../tools/e2e-releases.mts";

const resolved = resolveDriverReleases();

export const releases = resolved.releases;
export const targeted = resolved.targeted;
