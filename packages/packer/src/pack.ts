import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip from "adm-zip";
import imageSize from "image-size";
import { default as shelljs } from "shelljs";

shelljs.config.verbose = true;

const tag = process.argv[2];
if (!tag || !tag.startsWith("v")) {
	console.error("Invalid tag");
	process.exit(1);
}

const buildDir = `build/${tag}`;

shelljs.rm("-rf", buildDir);
shelljs.mkdir("-p", buildDir);
shelljs.exec(
	`git clone --depth 1 --branch=${tag} https://github.com/PathOfBuildingCommunity/PathOfBuilding.git ${buildDir}/repo`,
	{ fatal: true },
);

const rootDir = `${buildDir}/root`;
shelljs.rm("-rf", rootDir);
shelljs.mkdir("-p", rootDir);
shelljs.mkdir("-p", `${buildDir}/r2`);

const outputFile = [];

const zip = new AdmZip();

const basePath = `${buildDir}/repo/src`;
for (const file of shelljs.find(basePath)) {
	const relPath = path.relative(basePath, file).replace(/\\/g, "/");

	if (relPath.startsWith("Export")) continue;
	if (fs.statSync(file).isDirectory()) {
		continue;
	}

	if (path.extname(file) === ".png" || path.extname(file) === ".jpg") {
		const { width, height } = imageSize(file);
		outputFile.push(`${relPath}\t${width}\t${height}`);

		zip.addFile(relPath, Buffer.of());

		const dest = `${buildDir}/r2/root/${relPath}`;
		shelljs.mkdir("-p", path.dirname(dest));
		shelljs.cp(file, dest);
	}

	if (
		path.extname(file) === ".lua" ||
		path.extname(file) === ".zip" ||
		path.extname(file).startsWith(".part")
	) {
		zip.addFile(relPath, fs.readFileSync(file));
	}
}

const basePath2 = `${buildDir}/repo/runtime/lua`;
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
	`${buildDir}/repo/manifest.xml`,
);
zip.addFile("installed.cfg", Buffer.from(""));
zip.addFile("manifest.xml", Buffer.from(manifest));
zip.addFile("changelog.txt", fs.readFileSync(`${buildDir}/repo/changelog.txt`));
zip.addFile("help.txt", fs.readFileSync(`${buildDir}/repo/help.txt`));
zip.addFile("LICENSE.md", fs.readFileSync(`${buildDir}/repo/LICENSE.md`));

zip.writeZip(`${buildDir}/r2/root.zip`);
