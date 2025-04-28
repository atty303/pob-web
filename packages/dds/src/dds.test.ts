import fs from "node:fs";
import * as zstd from "@bokuweb/zstd-wasm";
import { parseDDSDX10 } from "dds/src";

await zstd.init();

const file = fs.readFileSync(
  // "../packer/build/2/v0.3.0/repo/src/TreeData/0_1/ascendancy-background_1500_1500_BC7.dds.zst",
  // "../packer/build/2/v0.6.0/repo/src/TreeData/0_1/skills_176_176_BC1.dds.zst",
  "../packer/build/2/v0.6.0/repo/src/TreeData/0_2/skills_176_176_BC1.dds.zst",
);
const data = zstd.decompress(new Uint8Array(file));
fs.writeFileSync("dds.dds", data);
const dds = parseDDSDX10(data);
