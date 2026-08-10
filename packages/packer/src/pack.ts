import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zstd from "@bokuweb/zstd-wasm";
import AdmZip from "adm-zip";
import { parseDDSDX10 } from "dds/src";
import { imageDimensionsFromData } from "image-dimensions";
import { gameData, isGame } from "pob-game/src";
import { default as shelljs } from "shelljs";

shelljs.config.verbose = false;
shelljs.config.fatal = true;

const clone = process.argv[4] === "clone";

const tag = process.argv[2];
if (!tag) {
  console.error("Invalid tag");
  process.exit(1);
}

const game = process.argv[3];
if (!game || !isGame(game)) {
  console.error("Invalid game");
  process.exit(1);
}
const def = gameData[game];

const buildDir = `build/${game}/${tag}`;
shelljs.mkdir("-p", buildDir);

// Mirror of the R2 directory structure
const r2Dir = `r2/games/${game}/versions/${tag}`;
shelljs.mkdir("-p", r2Dir);

const cacheMarker = `${r2Dir}/.pack-input.sha256`;
const inputHash = packInputHash();
if (
  clone &&
  fs.existsSync(`${r2Dir}/root.zip`) &&
  fs.existsSync(`${r2Dir}/root`) &&
  fs.existsSync(cacheMarker) &&
  fs.readFileSync(cacheMarker, "utf8") === inputHash
) {
  console.log(`Reusing packed ${game} ${tag}`);
  process.exit(0);
}

console.log(`Packing ${game} ${tag}`);
shelljs.rm("-rf", r2Dir);
shelljs.mkdir("-p", r2Dir);

await zstd.init();

const remote = `https://github.com/${def.repository.owner}/${def.repository.name}.git`;
const repoDir = `${buildDir}/repo`;

if (clone) {
  shelljs.rm("-rf", buildDir);
  shelljs.exec(`git clone --depth 1 --branch=${tag} ${remote} ${repoDir}`, { fatal: true });
}

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

    // PoB runs existence checks against the image file, but actual reading is done in the browser so we include an empty file in the zip
    zip.addFile(relPath, Buffer.of());

    const dest = `${r2Dir}/root/${relPath}`;
    shelljs.mkdir("-p", path.dirname(dest));
    shelljs.cp(file, dest);
  }

  if (
    path.extname(file) === ".lua" ||
    path.extname(file) === ".zip" ||
    path.extname(file).startsWith(".part") ||
    path.extname(file).startsWith(".json")
  ) {
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

zip.writeZip(`${buildDir}/root.zip`);
shelljs.cp(`${buildDir}/root.zip`, `${r2Dir}/root.zip`);

// For development, put the root.zip (and its extracted contents) where it is expected
const rootDir = `${buildDir}/root-zipfs`;
shelljs.rm("-rf", rootDir);
shelljs.mkdir("-p", rootDir);
zip.extractAllTo(rootDir, true);
fs.writeFileSync(cacheMarker, inputHash);

function packInputHash() {
  const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
  const inputs = [
    "deno.json",
    "deno.lock",
    "packages/dds/src",
    "packages/game/src",
    "packages/packer/deno.json",
    "packages/packer/src",
  ];
  const files = inputs.flatMap(input => filesUnder(path.join(workspaceRoot, input))).sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(workspaceRoot, file));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function filesUnder(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap(entry => filesUnder(path.join(target, entry.name)));
}

function ddsSize(file: string) {
  const data = zstd.decompress(fs.readFileSync(file));
  const tex = parseDDSDX10(data);
  return {
    width: tex.extent[0],
    height: tex.extent[1],
  };
}

function imageSize(file: string) {
  const dimensions = imageDimensionsFromData(fs.readFileSync(file));
  if (!dimensions) {
    throw new Error(`Unsupported or invalid image: ${file}`);
  }
  return dimensions;
}
