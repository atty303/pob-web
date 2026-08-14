import { type Backend, type InodeLike, isFile } from "@zenfs/core";
import { WebAccessFS, type WebAccessOptions } from "@zenfs/dom";

export class TruncatingWebAccessFileSystem extends WebAccessFS {
  override async touch(path: string, metadata: InodeLike): Promise<void> {
    const inode = await this.stat(path);
    if (metadata.size !== inode.size && isFile(inode)) {
      const handle = await this.get("file", path);
      const writable = await handle.createWritable({ keepExistingData: true });
      try {
        await writable.truncate(metadata.size);
        await writable.close();
      } catch (error) {
        await writable.abort(error).catch(() => {});
        throw error;
      }
    }
    await super.touch(path, metadata);
  }
}

export const TruncatingWebAccess = {
  name: "TruncatingWebAccess",
  options: {
    handle: { type: "object", required: true },
    metadata: { type: "string", required: false },
    disableHandleCache: { type: "boolean", required: false },
  },
  async create(options: WebAccessOptions) {
    const fileSystem = new TruncatingWebAccessFileSystem(options.handle, options.disableHandleCache);
    await fileSystem._loadMetadata(options.metadata);
    return fileSystem;
  },
} as const satisfies Backend<TruncatingWebAccessFileSystem, WebAccessOptions>;
