import * as fs from "node:fs";
import * as path from "node:path";
import imageSize from "image-size";

function visitDirs(
    base: string,
    dir: string,
    callback: (filePath: string, basePath: string) => void
): void {
    if (fs.statSync(dir).isDirectory()) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                visitDirs(base, filePath, callback);
            } else {
                callback(filePath, base);
            }
        }
    } else {
        callback(dir, base);
    }
}

fs.rmSync("build/vfs", { force: true, recursive: true });
fs.mkdirSync("build/vfs", { recursive: true });

const outputFile = fs.createWriteStream('build/vfs.tsv');

const callback = (filePath: string, basePath: string) => {
    const relPath = path.relative(basePath, filePath).replace(/\\/g, '/');

    if (relPath.startsWith("Export/")) return;

    if (path.extname(filePath) === '.png' || path.extname(filePath) === '.jpg') {
        const { width, height } = imageSize(filePath);
        outputFile.write(`${relPath}\t${width}\t${height}\n`);

        const vfsPath = `build/vfs/${relPath}`;
        const vfsDir = path.dirname(vfsPath);
        if (!fs.existsSync(vfsDir)) {
            fs.mkdirSync(vfsDir, { recursive: true });
        }
        fs.createWriteStream(vfsPath).end();
    }

    if (path.extname(filePath) === '.lua' || path.extname(filePath) === ".zip" || path.extname(filePath).startsWith(".part")) {
        const vfsPath = `build/vfs/${relPath}`;
        const vfsDir = path.dirname(vfsPath);
        if (!fs.existsSync(vfsDir)) {
            fs.mkdirSync(vfsDir, { recursive: true });
        }
        fs.copyFileSync(filePath, vfsPath);
    }
};

const basePath1 = '../../vendor/PathOfBuilding/src';
visitDirs(basePath1, basePath1, callback);

const basePath2 = '../../vendor/PathOfBuilding/runtime/lua';
visitDirs(basePath2, basePath2, callback);

const xml0 = fs.readFileSync('../../vendor/PathOfBuilding/manifest.xml', 'utf8');
const xml = xml0.replace(/<Version number="([0-9.]+)" \/>/, `<Version number="$1" platform="win32" branch="master" />`);
fs.writeFileSync('build/vfs/manifest.xml', xml);

outputFile.end();
