import { pathToFileURL } from "node:url";
import process from "node:process";

// Modularized Emscripten programs execute C main when their factory is called,
// not when their ES module is imported.
const { default: createModule } = await import(pathToFileURL(process.argv[2]).href);
await createModule();
