import * as fs from "node:fs";
import * as path from "node:path";
import * as zstd from "@bokuweb/zstd-wasm";
import AdmZip from "adm-zip";
import { type DDSImage, parseDDSDX10 } from "dds/src";
import imageSize from "image-size";
import { default as shelljs } from "shelljs";

await zstd.init();

shelljs.config.verbose = true;

const clone = process.argv[4] === "clone";

const tag = process.argv[2];
if (!tag) {
  console.error("Invalid tag");
  process.exit(1);
}

let product;
switch (process.argv[3]) {
  case "poe1":
    product = 1;
    break;
  case "poe2":
    product = 2;
    break;
  case "le":
    product = 3;
    break;
  default:
    product = undefined;
}
if (!product) {
  console.error("Invalid target");
  process.exit(1);
}

const buildDir = `build/${product}/${tag}`;
let remote;
switch (product) {
  case 1:
    remote = "https://github.com/PathOfBuildingCommunity/PathOfBuilding.git";
    break;
  case 2:
    remote = "https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2.git";
    break;
  default:
    remote = "https://github.com/Musholic/LastEpochPlanner.git";
    break;
}
const repoDir = `${buildDir}/repo`;

if (clone) {
  shelljs.rm("-rf", buildDir);
  shelljs.mkdir("-p", buildDir);
  shelljs.exec(`git clone --depth 1 --branch=${tag} ${remote} ${repoDir}`, { fatal: true });
}

const rootDir = `${buildDir}/root`;
shelljs.rm("-rf", rootDir);
shelljs.mkdir("-p", rootDir);
shelljs.mkdir("-p", `${buildDir}/r2`);

const outputFile = [];

const zip = new AdmZip();

const basePath = `${repoDir}/src`;
for (const file of shelljs.find(basePath)) {
  const relPath = path.relative(basePath, file).replace(/\\/g, "/");

  if (relPath.startsWith("Export")) continue;
  if (fs.statSync(file).isDirectory()) {
    if (relPath.length > 0) {
      zip.addFile(`${relPath}/`, null as unknown as Buffer);
    }
    continue;
  }

  const isImage = path.extname(file) === ".png" || path.extname(file) === ".jpg";
  const isDDS = file.endsWith(".dds.zst");
  if (isImage || isDDS) {
    const { width, height } = isDDS ? ddsSize(file) : imageSize(file);
    outputFile.push(`${relPath}\t${width}\t${height}`);

    zip.addFile(relPath, Buffer.of());

    const dest = `${buildDir}/r2/root/${relPath}`;
    shelljs.mkdir("-p", path.dirname(dest));
    shelljs.cp(file, dest);
  }

  if (path.extname(file) === ".lua" || path.extname(file) === ".zip" || path.extname(file).startsWith(".part") || path.extname(file).startsWith(".json")) {
    const content = fs.readFileSync(file);

    // patching
    const newRelPath = relPath.replace(/Specific_Skill_Stat_Descriptions/g, "specific_skill_stat_descriptions");
    const newContent = (() => {
      if (relPath.endsWith("StatDescriber.lua")) {
        return Buffer.from(
          content.toString().replace(/Specific_Skill_Stat_Descriptions/g, "specific_skill_stat_descriptions"),
        );
      } else {
        return content;
      }
    })();

    zip.addFile(newRelPath, newContent);
  }
}

const basePath2 = `${repoDir}/runtime/lua`;
for (const file of shelljs.find(basePath2)) {
  const relPath = path.relative(basePath2, file).replace(/\\/g, "/");
  if (path.extname(file) === ".lua") {
    zip.addFile(`lua/${relPath}`, fs.readFileSync(file));
  }
}

zip.addFile(".image.tsv", Buffer.from(outputFile.join("\n")));

const manifest = shelljs.sed(
  /<Version number="([0-9.]+)" \/>/,
  `<Version number="$1" platform="win32" branch="master" />`,
  `${repoDir}/manifest.xml`,
);
zip.addFile("installed.cfg", Buffer.from(""));
zip.addFile("manifest.xml", Buffer.from(manifest));
zip.addFile("changelog.txt", fs.readFileSync(`${repoDir}/changelog.txt`));
zip.addFile("help.txt", fs.readFileSync(`${repoDir}/help.txt`));
zip.addFile("LICENSE.md", fs.readFileSync(`${repoDir}/LICENSE.md`));

zip.writeZip(`${buildDir}/r2/root.zip`);
zip.extractAllTo(rootDir, true);

// For development, put the root.zip (and its extracted contents) where it is expected
const devBuildDir = `build.${product}/${tag}`;
shelljs.mkdir("-p", devBuildDir);
shelljs.cp(`${buildDir}/r2/root.zip`, devBuildDir);

const devRootDir = `${devBuildDir}/root`;
zip.extractAllTo(devRootDir, true);

function ddsSize(file: string) {
  const data = zstd.decompress(fs.readFileSync(file));
  const tex = parseDDSDX10(data);
  return {
    width: tex.extent[0],
    height: tex.extent[1],
  };
}
