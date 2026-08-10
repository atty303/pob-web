import { Command, EnumType } from "@cliffy/command";
import $ from "@david/dax";
import { resolveDriverReleases, webE2EReleases } from "./e2e-releases.mts";

const { options } = await new Command()
  .name("pack-e2e-assets")
  .description("Pack the local assets required by an E2E suite")
  .type("suite", new EnumType(["driver", "web"] as const))
  .option("--suite <suite:suite>", "E2E suite", { required: true })
  .parse(Deno.args);

const releases = options.suite === "driver" ? resolveDriverReleases().releases : webE2EReleases;
for (const release of releases) {
  await $`mise run pack --game ${release.game} --tag ${release.version}`;
}
