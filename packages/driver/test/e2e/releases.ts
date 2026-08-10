import { resolveDriverReleases } from "../../../../tools/e2e-releases.ts";

const resolved = resolveDriverReleases();

export const releases = resolved.releases;
export const targeted = resolved.targeted;
