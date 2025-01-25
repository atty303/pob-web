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

const product = process.argv[3] === "1" ? 1 : process.argv[3] === "2" ? 2 : undefined;
if (!product) {
  console.error("Invalid target");
  process.exit(1);
}

const buildDir = `build/${product}/${tag}`;
const remote =
  product === 1
    ? "https://github.com/PathOfBuildingCommunity/PathOfBuilding.git"
    : "https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2.git";
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

  if (path.extname(file) === ".lua" || path.extname(file) === ".zip" || path.extname(file).startsWith(".part")) {
    zip.addFile(relPath, fs.readFileSync(file));
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

function ddsSize(file: string) {
  const data = zstd.decompress(fs.readFileSync(file));
  return parseDDSDX10(data);
}
