import { fs } from "@zenfs/core";

const ROOT_OPEN = "<PathOfBuilding";
const ROOT_CLOSE = "</PathOfBuilding>";

export async function removeStaleSettingsSuffix(path: string): Promise<boolean> {
  let contents: string;
  try {
    contents = await fs.promises.readFile(path, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return false;
    throw error;
  }

  const opening = contents.indexOf(ROOT_OPEN);
  const closing = contents.indexOf(ROOT_CLOSE, opening + ROOT_OPEN.length);
  if (opening < 0 || closing < 0) return false;

  const end = closing + ROOT_CLOSE.length;
  if (!contents.slice(end).includes(ROOT_CLOSE)) return false;

  await fs.promises.writeFile(path, `${contents.slice(0, end)}\n`);
  return true;
}
