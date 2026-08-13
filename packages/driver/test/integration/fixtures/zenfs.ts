import { Zip } from "@zenfs/archives";
import { configure, fs, resolveMountConfig } from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import { rejectWrites } from "../../../src/js/fs.ts";

const rootZip = Uint8Array.from(
  atob(
    "UEsDBBQAAAgIAP2xDV0kOLI/BgAAAAQAAAARAAAAYXBwL0RhdGEvYmxvYi5iaW5jYGT6DwBQSwMEFAAACAgA/bENXU5KJyEPAAAADQAAABEAAABhcHAvRGF0YS90ZXN0LnR4dCvKzy9RSMusKCktSuUCAFBLAQIUAxQAAAgIAP2xDV0kOLI/BgAAAAQAAAARAAAAAAAAAAAAAACkgQAAAABhcHAvRGF0YS9ibG9iLmJpblBLAQIUAxQAAAgIAP2xDV1OSichDwAAAA0AAAARAAAAAAAAAAAAAACkgTUAAABhcHAvRGF0YS90ZXN0LnR4dFBLBQYAAAAAAgACAH4AAABzAAAAAAA=",
  ),
  (character) => character.charCodeAt(0),
);

declare global {
  interface Window {
    zenfsIntegration: {
      readRoot(): Promise<{ text: string; binary: number[]; entries: string[]; writeError: string }>;
      writeUser(): Promise<void>;
      readUser(): Promise<{ text: string; size: number; entries: string[] }>;
      clearUser(): Promise<void>;
    };
  }
}

async function configureRoot() {
  const root = await resolveMountConfig({ backend: Zip, data: rootZip.buffer, name: "root.zip" });
  rejectWrites(root);
  await configure({ mounts: { "/root": root } });
}

async function configureUser() {
  const handle = await navigator.storage.getDirectory();
  const user = await resolveMountConfig({ backend: WebAccess, handle, disableAsyncCache: true });
  await configure({ mounts: { "/user": user } });
}

window.zenfsIntegration = {
  async readRoot() {
    await configureRoot();
    let writeError = "";
    try {
      await fs.promises.writeFile("/root/app/Data/test.txt", "changed");
    } catch (error) {
      writeError = String(error);
    }
    return {
      text: await fs.promises.readFile("/root/app/Data/test.txt", "utf8"),
      binary: [...await fs.promises.readFile("/root/app/Data/blob.bin")],
      entries: await fs.promises.readdir("/root/app/Data"),
      writeError,
    };
  },

  async writeUser() {
    await configureUser();
    await fs.promises.mkdir("/user/Builds/Nested", { recursive: true });
    await fs.promises.writeFile("/user/Builds/Nested/build.xml", "0123456789");
  },

  async readUser() {
    await configureUser();
    const path = "/user/Builds/Nested/build.xml";
    return {
      text: await fs.promises.readFile(path, "utf8"),
      size: (await fs.promises.stat(path)).size,
      entries: await fs.promises.readdir("/user/Builds/Nested"),
    };
  },

  async clearUser() {
    const handle = await navigator.storage.getDirectory();
    for await (const name of handle.keys()) await handle.removeEntry(name, { recursive: true });
  },
};
