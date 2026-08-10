import { Command } from "@cliffy/command";
import $ from "@david/dax";

const { args: files } = await new Command()
  .name("check-files")
  .description("Type-check files using their nearest Deno workspace configuration")
  .arguments("<files...:string>")
  .parse(Deno.args);

const groups = new Map<string, string[]>();
for (const file of files) {
  const match = file.match(/^(packages\/[^/]+)\//);
  const config = match ? `${match[1]}/deno.json` : "deno.json";
  const group = groups.get(config) ?? [];
  group.push(file);
  groups.set(config, group);
}

for (const [config, group] of groups) {
  await $`deno check --config ${config} ${group}`;
}
