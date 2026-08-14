import type { Backend, CreationOptions, InodeLike } from "@zenfs/core";
import * as zenfs from "@zenfs/core";
import { log, tag } from "./logger.ts";

const DIRECT_ACCESS = 0x2000;

export function rejectWrites(fileSystem: zenfs.FileSystem): void {
  // ZenFS 2.6.2 checks this attribute before mutating a VNode, but omits it from FileSystemAttributes.
  (fileSystem.attributes as Map<string, void>).set("readonly");
}

class FetchError extends Error {
  constructor(
    public readonly response: Response,
    message?: string,
  ) {
    super(message || `${response.status}: ${response.statusText}`);
  }
}

function inodeToMetadata(inode: InodeLike) {
  return {
    dir: (inode.mode & zenfs.constants.S_IFMT) === zenfs.constants.S_IFDIR,
    atimeMs: inode.atimeMs,
    mtimeMs: inode.mtimeMs,
    ctimeMs: inode.ctimeMs,
    birthtimeMs: inode.birthtimeMs,
    uid: inode.uid,
    gid: inode.gid,
    size: inode.size,
    mode: inode.mode,
    ino: inode.ino,
    flags: inode.flags,
  };
}

export class CloudflareKVFileSystem extends zenfs.IndexFS {
  private readonly prefetched = new Map<string, Uint8Array<ArrayBuffer>>();
  private readonly fetch: (
    method: string,
    path: string,
    body?: Uint8Array<ArrayBuffer>,
    headers?: Record<string, string>,
  ) => Promise<Response>;

  constructor(
    readonly prefix: string,
    readonly token: string,
    readonly ns: string | undefined,
  ) {
    super(0x43464b56, /*CFKV*/ "cloudflare-kvfs");
    this.fetch = (method: string, path: string, body?: Uint8Array<ArrayBuffer>, headers?: Record<string, string>) => {
      log.debug(tag.kvfs, "fetch", method, path);
      return fetch(`${prefix}${path}`, {
        method,
        body,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(ns ? { "x-user-namespace": ns } : {}),
          ...(headers ?? {}),
        },
      });
    };
  }

  override async ready(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const nextIndex = new zenfs.Index();
    nextIndex.set(
      "/",
      new zenfs.Inode({ mode: 0o777 | zenfs.constants.S_IFDIR, size: 4096, ino: 0, data: 1, nlink: 1 }),
    );

    const response = await this.fetch("GET", "");
    if (!response.ok) {
      throw new FetchError(response);
    }

    const entries = await response.json() as Array<{
      name: string;
      metadata?: (Partial<InodeLike> & { dir?: boolean }) | null;
    }>;
    const directoryNames = new Set(
      entries
        .filter((entry) =>
          entry.metadata?.dir === true ||
          (entry.metadata?.mode !== undefined &&
            (entry.metadata.mode & zenfs.constants.S_IFMT) === zenfs.constants.S_IFDIR)
        )
        .map((entry) => entry.name),
    );
    for (const { name } of entries) {
      for (let separator = name.lastIndexOf("/"); separator > 0; separator = name.lastIndexOf("/", separator - 1)) {
        directoryNames.add(name.slice(0, separator));
      }
    }
    for (const { name, metadata } of entries) {
      const id = nextIndex._alloc();
      const normalizedMetadata = metadata ?? {};
      const recovered = directoryNames.has(name)
        ? {
          ...normalizedMetadata,
          mode: zenfs.constants.S_IFDIR | 0o777,
          size: 4096,
        }
        : {
          ...normalizedMetadata,
          mode: zenfs.constants.S_IFREG | 0o777,
          flags: DIRECT_ACCESS,
        };
      nextIndex.set(`/${name}`, new zenfs.Inode({ ...recovered, ino: id, data: id + 1, nlink: 1 }));
    }
    this.index.clear();
    this.prefetched.clear();
    for (const [path, inode] of nextIndex) this.index.set(path, inode);
    log.debug(tag.kvfs, "reload", { entries: [...this.index.keys()] });
  }

  protected override async remove(path: string): Promise<void> {
    log.debug(tag.kvfs, "remove", { path });
    const response = await this.fetch("DELETE", path);
    if (!response.ok) {
      throw new FetchError(response);
    }
  }

  protected override removeSync(_path: string): void {
    throw new Error("Synchronous operations are not supported");
  }

  override async createFile(path: string, options: CreationOptions): Promise<zenfs.Inode> {
    const inode = await super.createFile(path, options);
    inode.update({ mode: zenfs.constants.S_IFREG | 0o777, flags: DIRECT_ACCESS });
    try {
      await this.persist(path, new Uint8Array(0), inode);
      return inode;
    } catch (error) {
      this.index.delete(path);
      throw error;
    }
  }

  protected override async _mkdir(path: string, _options: CreationOptions): Promise<void> {
    const inode = this.index.get(path)!;
    inode.update({ mode: zenfs.constants.S_IFDIR | 0o777, size: 4096 });
    try {
      await this.persist(path, new Uint8Array(0), inode);
    } catch (error) {
      this.index.delete(path);
      throw error;
    }
  }

  override async stat(path: string): Promise<zenfs.Inode> {
    const inode = this.index.get(path);
    if (inode && (inode.mode & zenfs.constants.S_IFMT) === zenfs.constants.S_IFREG) {
      const data = await this.load(path);
      inode.update({ size: data.length, flags: DIRECT_ACCESS });
      this.prefetched.set(path, data);
    }
    if (!inode) return await super.stat(path);
    return inode;
  }

  override async read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void> {
    const inode = this.index.get(path);
    if (inode && (inode.mode & zenfs.constants.S_IFMT) === zenfs.constants.S_IFDIR) {
      buffer.fill(0, 0, end - offset);
      return;
    }

    const data = this.prefetched.get(path) ?? await this.load(path);
    this.prefetched.delete(path);
    buffer.set(data.subarray(offset, end));
  }

  override readSync(_path: string, _buffer: Uint8Array, _offset: number, _end: number): void {
    throw new Error("Synchronous operations are not supported");
  }

  override async write(path: string, data: Uint8Array, offset: number): Promise<void> {
    const inode = this.index.get(path)!;
    const existing = await this.load(path, true);
    const contents = new Uint8Array(Math.max(existing.length, inode.size, offset + data.length));
    contents.set(existing.subarray(0, contents.length));
    contents.set(data, offset);
    inode.update({ size: contents.length, mtimeMs: Date.now() });
    await this.persist(path, contents, inode);
  }

  override writeSync(_path: string, _buffer: Uint8Array, _offset: number): void {
    throw new Error("Synchronous operations are not supported");
  }

  override async touch(path: string, metadata: InodeLike): Promise<void> {
    await super.touch(path, metadata);
    const inode = this.index.get(path)!;
    if ((inode.mode & zenfs.constants.S_IFMT) === zenfs.constants.S_IFDIR) {
      await this.persist(path, new Uint8Array(0), inode);
      return;
    }

    const existing = await this.load(path, true);
    const contents = new Uint8Array(inode.size);
    contents.set(existing.subarray(0, inode.size));
    await this.persist(path, contents, inode);
  }

  override touchSync(_path: string, _metadata: InodeLike): void {
    throw new Error("Synchronous operations are not supported");
  }

  private async load(path: string, missingAllowed = false): Promise<Uint8Array<ArrayBuffer>> {
    const response = await this.fetch("GET", path);
    if (missingAllowed && response.status === 404) {
      return new Uint8Array(0);
    }
    if (!response.ok) {
      throw new FetchError(response);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  private async persist(path: string, data: Uint8Array, inode: InodeLike): Promise<void> {
    const response = await this.fetch("PUT", path, new Uint8Array(data), {
      "x-metadata": JSON.stringify(inodeToMetadata(inode)),
    });
    if (!response.ok) {
      throw new FetchError(response);
    }
  }
}

export interface CloudflareKVOptions {
  prefix: string;
  token: string;
  namespace?: string;
}

export const CloudflareKV = {
  name: "CloudflareKV",
  options: {
    prefix: { type: "string", required: true },
    token: { type: "string", required: true },
    namespace: { type: "string", required: false },
  },
  isAvailable(): boolean {
    return true;
  },
  create(options: CloudflareKVOptions) {
    return new CloudflareKVFileSystem(options.prefix, options.token, options.namespace);
  },
} as const satisfies Backend<CloudflareKVFileSystem, CloudflareKVOptions>;
