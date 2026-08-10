import { Command } from "@cliffy/command";
import $ from "@david/dax";
import { copy, ensureDir, exists, walk } from "@std/fs";
import { dirname, extname, fromFileUrl, join, relative, resolve } from "@std/path";
import * as zstd from "@bokuweb/zstd-wasm";
import AdmZip from "adm-zip";
import { parseDDSDX10 } from "dds";
import { imageDimensionsFromData } from "image-dimensions";
import { gameData, isGame } from "pob-game";
import { Buffer } from "node:buffer";

const { args: [tag, game, mode] } = await new Command()
  .name("pack")
  .description("Pack an upstream Path of Building release")
  .arguments("<tag:string> <game:string> [mode:string]")
  .parse(Deno.args);

if (!isGame(game)) throw new Error(`Unsupported game: ${game}`);
if (mode !== undefined && mode !== "clone") throw new Error(`Unsupported mode: ${mode}`);

const clone = mode === "clone";
const def = gameData[game];
const buildDir = `build/${game}/${tag}`;
const r2Dir = `r2/games/${game}/versions/${tag}`;
await ensureDir(buildDir);
await ensureDir(r2Dir);

const cacheMarker = `${r2Dir}/.pack-input.sha256`;
const inputHash = await packInputHash();
if (
  clone &&
  await exists(`${r2Dir}/root.zip`) &&
  await exists(`${r2Dir}/root`) &&
  await exists(cacheMarker) &&
  await Deno.readTextFile(cacheMarker) === inputHash
) {
  console.log(`Reusing packed ${game} ${tag}`);
  Deno.exit(0);
}

console.log(`Packing ${game} ${tag}`);
await remove(r2Dir);
await ensureDir(r2Dir);
await zstd.init();

const remote = `https://github.com/${def.repository.owner}/${def.repository.name}.git`;
const repoDir = `${buildDir}/repo`;
if (clone) {
  await remove(buildDir);
  await $`git clone --depth 1 --branch=${tag} ${remote} ${repoDir}`;
}

const imageIndex: string[] = [];
const zip = new AdmZip();
const basePath = `${repoDir}/src`;
for await (const entry of walk(basePath, { includeDirs: true, followSymlinks: false })) {
  const relPath = relative(basePath, entry.path).replaceAll("\\", "/");
  if (relPath.startsWith("Export")) continue;
  if (entry.isDirectory) {
    if (relPath) zip.addFile(`${relPath}/`, Buffer.alloc(0));
    continue;
  }

  const extension = extname(entry.path);
  const isImage = extension === ".png" || extension === ".jpg";
  const isDDS = entry.path.endsWith(".dds.zst");
  if (isImage || isDDS) {
    const { width, height } = isDDS ? await ddsSize(entry.path) : await imageSize(entry.path);
    imageIndex.push(`${relPath}\t${width}\t${height}`);
    zip.addFile(relPath, Buffer.alloc(0));

    const destination = `${r2Dir}/root/${relPath}`;
    await ensureDir(dirname(destination));
    await copy(entry.path, destination, { overwrite: true });
  }

  if (extension === ".lua" || extension === ".zip" || extension.startsWith(".part") || extension.startsWith(".json")) {
    const content = await Deno.readFile(entry.path);
    const newRelPath = relPath.replaceAll("Specific_Skill_Stat_Descriptions", "specific_skill_stat_descriptions");
    const newContent = relPath.endsWith("StatDescriber.lua")
      ? new TextEncoder().encode(
        new TextDecoder().decode(content).replaceAll(
          "Specific_Skill_Stat_Descriptions",
          "specific_skill_stat_descriptions",
        ),
      )
      : content;
    zip.addFile(newRelPath, Buffer.from(newContent));
  }
}

const luaPath = `${repoDir}/runtime/lua`;
for await (const entry of walk(luaPath, { includeDirs: false, exts: [".lua"] })) {
  const relPath = relative(luaPath, entry.path).replaceAll("\\", "/");
  zip.addFile(`lua/${relPath}`, Buffer.from(await Deno.readFile(entry.path)));
}

zip.addFile(".image.tsv", Buffer.from(imageIndex.join("\n")));
const manifest = (await Deno.readTextFile(`${repoDir}/manifest.xml`)).replace(
  /<Version number="([0-9.]+)" \/>/,
  '<Version number="$1" platform="win32" branch="master" />',
);
zip.addFile("installed.cfg", Buffer.alloc(0));
zip.addFile("manifest.xml", Buffer.from(manifest));
for (const file of ["changelog.txt", "help.txt", "LICENSE.md"]) {
  zip.addFile(file, Buffer.from(await Deno.readFile(`${repoDir}/${file}`)));
}

const rootZip = Buffer.from(zip.toBuffer());
await Deno.writeFile(`${buildDir}/root.zip`, rootZip);
await Deno.writeFile(`${r2Dir}/root.zip`, rootZip);

const rootDir = `${buildDir}/root-zipfs`;
await remove(rootDir);
await ensureDir(rootDir);
zip.extractAllTo(rootDir, true);
await Deno.writeTextFile(cacheMarker, inputHash);

async function packInputHash(): Promise<string> {
  const workspaceRoot = resolve(dirname(fromFileUrl(import.meta.url)), "../../..");
  const inputs = [
    "deno.json",
    "deno.lock",
    "packages/dds/src",
    "packages/game/src",
    "packages/packer/deno.json",
    "packages/packer/src",
  ];
  const files: string[] = [];
  for (const input of inputs) {
    const target = join(workspaceRoot, input);
    const stat = await Deno.stat(target);
    if (stat.isFile) files.push(target);
    else for await (const entry of walk(target, { includeDirs: false })) files.push(entry.path);
  }
  files.sort();

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  for (const file of files) {
    chunks.push(encoder.encode(`${relative(workspaceRoot, file)}\0`));
    chunks.push(await Deno.readFile(file));
    chunks.push(Uint8Array.of(0));
  }
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function remove(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function ddsSize(file: string) {
  const tex = parseDDSDX10(zstd.decompress(await Deno.readFile(file)));
  return { width: tex.extent[0], height: tex.extent[1] };
}

async function imageSize(file: string) {
  const dimensions = imageDimensionsFromData(await Deno.readFile(file));
  if (!dimensions) throw new Error(`Unsupported or invalid image: ${file}`);
  return dimensions;
}
