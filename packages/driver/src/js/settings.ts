import { fs } from "@zenfs/core";
import type { SettingsRootElement } from "pob-game";

export async function removeStaleSettingsSuffix(path: string, rootElement: SettingsRootElement): Promise<boolean> {
  let contents: string;
  try {
    contents = await fs.promises.readFile(path, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return false;
    throw error;
  }

  const rootOpen = `<${rootElement}`;
  const rootClose = `</${rootElement}>`;
  const opening = contents.indexOf(rootOpen);
  const closing = contents.indexOf(rootClose, opening + rootOpen.length);
  if (opening < 0 || closing < 0) return false;

  const end = closing + rootClose.length;
  if (!contents.slice(end).includes(rootClose)) return false;

  await fs.promises.writeFile(path, `${contents.slice(0, end)}\n`);
  return true;
}
