import type { Backend } from "@zenfs/core";
import * as zenfs from "@zenfs/core";
import { Errno, ErrnoError, Stats } from "@zenfs/core";
import { log, tag } from "./logger";

class FetchError extends Error {
  constructor(
    public readonly response: Response,
    message?: string,
  ) {
    super(message || `${response.status}: ${response.statusText}`);
  }
}

function statsToMetadata(stats: zenfs.StatsLike) {
  return {
    atimeMs: stats.atimeMs,
    mtimeMs: stats.mtimeMs,
    ctimeMs: stats.ctimeMs,
    birthtimeMs: stats.birthtimeMs,
    uid: stats.uid,
    gid: stats.gid,
    size: stats.size,
    mode: stats.mode,
    ino: stats.ino,
  };
}

export class CloudflareKVFileSystem extends zenfs.FileSystem {
  private readonly fetch: (
    method: string,
    path: string,
    body?: Uint8Array,
    headers?: Record<string, string>,
  ) => Promise<Response>;
  private cache: Map<string, Stats> = new Map();

  constructor(
    readonly prefix: string,
    readonly token: string,
    readonly ns: string | undefined,
  ) {
    super();
    this.fetch = (method: string, path: string, body?: Uint8Array, headers?: Record<string, string>) => {
      log.debug(tag.kvfs, "fetch", method, path);
      const url = `${prefix}${path}`;
      return fetch(url, {
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

  async ready(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.cache = new Map(await this.readList());
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    log.debug(tag.kvfs, "rename", { oldPath, newPath });
    const oldFile = await this.openFile(oldPath, "r");
    const stats = await oldFile.stat();
    const buffer = new Uint8Array(stats.size);
    await oldFile.read(buffer, 0, stats.size, 0);
    await oldFile.close();

    const newFile = await this.createFile(newPath, "w", stats.mode);
    await newFile.write(buffer, 0, buffer.length, 0);
    await newFile.close();

    await this.unlink(oldPath);
    this.cache.delete(oldPath);
    this.cache.set(newPath, stats);
  }
  renameSync(_oldPath: string, _newPath: string): void {
    throw new Error("Method not implemented.");
  }

  async stat(path: string): Promise<zenfs.Stats> {
    // log.debug(tag.kvfs, "stat", path);
    return this.statSync(path);
  }
  statSync(path: string): zenfs.Stats {
    const stats = this.cache.get(path);
    if (!stats) {
      throw new ErrnoError(Errno.ENOENT, "path", path, "stat");
    }
    return stats;
  }

  async openFile(path: string, flag: string): Promise<zenfs.File> {
    log.debug(tag.kvfs, "openFile", { path, flag });
    let buffer: ArrayBufferLike;
    let stats = this.cache.get(path);
    if (zenfs.isWriteable(flag)) {
      buffer = new ArrayBuffer(0);
      stats = new zenfs.Stats({ mode: 0o777 | zenfs.constants.S_IFREG, size: 0 });
      this.cache.set(path, stats);
    } else {
      if (!stats) {
        throw ErrnoError.With("ENOENT", path, "openFile");
      }
      if (!stats.hasAccess(zenfs.flagToMode(flag))) {
        throw ErrnoError.With("EACCES", path, "openFile");
      }
      const r = await this.fetch("GET", path);
      if (!r.ok) {
        throw new FetchError(r);
      }
      buffer = await (await r.blob()).arrayBuffer();
    }

    return new zenfs.PreloadFile(this, path, flag, stats, new Uint8Array(buffer));
  }
  openFileSync(_path: string, _flag: string): zenfs.File {
    throw new Error("Method not implemented.");
  }

  async createFile(path: string, flag: string, mode: number): Promise<zenfs.File> {
    log.debug(tag.kvfs, "createFile", { path, flag, mode });
    const data = new Uint8Array(0);
    const r = await this.fetch("PUT", path, data);
    if (!r.ok) {
      throw new FetchError(r);
    }
    const stats = new zenfs.Stats({ mode: mode | zenfs.constants.S_IFREG, size: 0 });
    this.cache.set(path, stats);
    return new zenfs.PreloadFile(this, path, flag, stats, data);
  }
  createFileSync(_path: string, _flag: string, _mode: number): zenfs.File {
    throw new Error("Method not implemented.");
  }

  async unlink(path: string): Promise<void> {
    log.debug(tag.kvfs, "unlink", { path });
    const r = await this.fetch("DELETE", path);
    if (!r.ok) {
      throw new FetchError(r);
    }
    this.cache.delete(path);
  }
  unlinkSync(_path: string): void {
    throw new Error("Method not implemented.");
  }

  async rmdir(path: string): Promise<void> {
    log.debug(tag.kvfs, "rmdir", { path });
    const r = await this.fetch("DELETE", path);
    if (!r.ok) {
      throw new FetchError(r);
    }
    this.cache.delete(path);
  }
  rmdirSync(_path: string): void {
    throw new Error("Method not implemented.");
  }

  async mkdir(path: string, mode: number): Promise<void> {
    log.debug(tag.kvfs, "mkdir", { path, mode });
    const stats = new zenfs.Stats({ mode: mode | zenfs.constants.S_IFDIR, size: 4096 });
    const r = await this.fetch("PUT", path, new Uint8Array(0), {
      "x-metadata": JSON.stringify(statsToMetadata(stats)),
    });
    if (!r.ok) {
      throw new FetchError(r);
    }
    this.cache.set(path, stats);
  }
  mkdirSync(_path: string, _mode: number): void {
    throw new Error("Method not implemented.");
  }

  async readdir(path: string): Promise<string[]> {
    log.debug(tag.kvfs, "readdir", { path });
    return this.readdirSync(path);
  }
  readdirSync(path: string): string[] {
    const prefix = !path.endsWith("/") ? `${path}/` : path;
    return [...this.cache.keys()]
      .filter(_ => _.startsWith(prefix) && _.substring(prefix.length).split("/").length === 1)
      .map(_ => _.substring(prefix.length))
      .filter(_ => _.length > 0);
  }

  link(_srcpath: string, _dstpath: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  linkSync(_srcpath: string, _dstpath: string): void {
    throw new Error("Method not implemented.");
  }

  async sync(path: string, data: Uint8Array, stats: Readonly<zenfs.Stats>): Promise<void> {
    log.debug(tag.kvfs, "sync", { path, data, stats });
    const metadata = statsToMetadata(stats);
    const body = new Uint8Array(data.byteLength);
    body.set(data);
    const r = await this.fetch("PUT", path, body, { "x-metadata": JSON.stringify(metadata) });
    if (!r.ok) {
      log.error(tag.kvfs, "sync", path, r.status, r.statusText);
      throw ErrnoError.With("EIO", path, "sync");
    }
    this.cache.set(path, new Stats(stats));
  }
  syncSync(_path: string, _data: Uint8Array, _stats: Readonly<zenfs.Stats>): void {
    throw new Error("Method not implemented.");
  }

  protected async readList() {
    const r = await this.fetch("GET", "");
    if (!r.ok) {
      throw new FetchError(r);
    }
    const list = [
      ["/", new zenfs.Stats({ mode: 0o777 | zenfs.constants.S_IFDIR, size: 4096 })],
      ...(await r.json()).map((_: { name: string; metadata: { dir: boolean; size: number } }) => [
        `/${_.name}`,
        new zenfs.Stats(_.metadata),
      ]),
    ];
    log.debug(tag.kvfs, "readList", { list });
    return list;
  }

  read(_path: string, _buffer: Uint8Array, _offset: number, _end: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  readSync(_path: string, _buffer: Uint8Array, _offset: number, _end: number): void {
    throw new Error("Method not implemented.");
  }

  write(_path: string, _buffer: Uint8Array, _offset: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  writeSync(_path: string, _buffer: Uint8Array, _offset: number): void {
    throw new Error("Method not implemented.");
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
    prefix: {
      type: "string",
      required: true,
      description: "The URL prefix to use for requests",
    },
    token: {
      type: "string",
      required: true,
      description: "The JWT token to use",
    },
    namespace: {
      type: "string",
      required: false,
      description: "The user namespace to use",
    },
  },

  isAvailable(): boolean {
    return true;
  },

  create(options: CloudflareKVOptions) {
    return new CloudflareKVFileSystem(options.prefix, options.token, options.namespace);
  },
} as const satisfies Backend<CloudflareKVFileSystem, CloudflareKVOptions>;
