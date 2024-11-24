import type { Backend, FileSystemMetadata } from "@zenfs/core";
import * as zenfs from "@zenfs/core";
import { Errno, ErrnoError, FileSystem, InMemory, PreloadFile, Stats } from "@zenfs/core";
import { basename, dirname, join } from "@zenfs/core/emulation/path.js";
import { log, tag } from "./logger.ts";

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
      .filter((_) => _.startsWith(prefix) && _.substring(prefix.length).split("/").length === 1)
      .map((_) => _.substring(prefix.length))
      .filter((_) => _.length > 0);
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
}

export interface CloudflareKVOptions {
  prefix: string;
  token: string;
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
  },

  isAvailable(): boolean {
    return true;
  },

  create(options: CloudflareKVOptions) {
    return new CloudflareKVFileSystem(options.prefix, options.token);
  },
} as const satisfies Backend<CloudflareKVFileSystem, CloudflareKVOptions>;

/**
 * Converts a DOMException into an Errno
 * @see https://developer.mozilla.org/Web/API/DOMException
 */
function errnoForDOMException(ex: DOMException): keyof typeof Errno {
  switch (ex.name) {
    case "IndexSizeError":
    case "HierarchyRequestError":
    case "InvalidCharacterError":
    case "InvalidStateError":
    case "SyntaxError":
    case "NamespaceError":
    case "TypeMismatchError":
    case "ConstraintError":
    case "VersionError":
    case "URLMismatchError":
    case "InvalidNodeTypeError":
      return "EINVAL";
    case "WrongDocumentError":
      return "EXDEV";
    case "NoModificationAllowedError":
    case "InvalidModificationError":
    case "InvalidAccessError":
    case "SecurityError":
    case "NotAllowedError":
      return "EACCES";
    case "NotFoundError":
      return "ENOENT";
    case "NotSupportedError":
      return "ENOTSUP";
    case "InUseAttributeError":
      return "EBUSY";
    case "NetworkError":
      return "ENETDOWN";
    case "AbortError":
      return "EINTR";
    case "QuotaExceededError":
      return "ENOSPC";
    case "TimeoutError":
      return "ETIMEDOUT";
    case "ReadOnlyError":
      return "EROFS";
    default:
      return "EIO";
  }
}

/**
 * @internal
 */
export type ConvertException = ErrnoError | DOMException | Error;

/**
 * Handles converting errors, then rethrowing them
 * @internal
 */
export function convertException(ex: ConvertException, path?: string, syscall?: string): ErrnoError {
  if (ex instanceof ErrnoError) {
    return ex;
  }

  const code = ex instanceof DOMException ? Errno[errnoForDOMException(ex)] : Errno.EIO;
  const error = new ErrnoError(code, ex.message, path, syscall);
  error.stack = ex.stack!;
  (error as any).cause = (ex as any).cause;
  return error;
}

declare global {
  interface FileSystemDirectoryHandle {
    [Symbol.iterator](): IterableIterator<[string, FileSystemHandle]>;
    entries(): IterableIterator<[string, FileSystemHandle]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<FileSystemHandle>;
  }
}

export interface WebAccessOptions {
  handle: FileSystemDirectoryHandle;
}

export class WebAccessFS extends FileSystem {
  renameSync(_oldPath: string, _newPath: string): void {
    throw new Error("Method not implemented.");
  }
  statSync(_path: string): zenfs.Stats {
    throw new Error("Method not implemented.");
  }
  openFileSync(_path: string, _flag: string): zenfs.File {
    throw new Error("Method not implemented.");
  }
  createFileSync(_path: string, _flag: string, _mode: number): zenfs.File {
    throw new Error("Method not implemented.");
  }
  unlinkSync(_path: string): void {
    throw new Error("Method not implemented.");
  }
  rmdirSync(_path: string): void {
    throw new Error("Method not implemented.");
  }
  mkdirSync(_path: string, _mode: number): void {
    throw new Error("Method not implemented.");
  }
  readdirSync(_path: string): string[] {
    throw new Error("Method not implemented.");
  }
  linkSync(_srcpath: string, _dstpath: string): void {
    throw new Error("Method not implemented.");
  }
  syncSync(_path: string, _data: Uint8Array, _stats: Readonly<zenfs.Stats>): void {
    throw new Error("Method not implemented.");
  }

  private _handles: Map<string, FileSystemHandle> = new Map();

  /**
   * @hidden
   */
  _sync: FileSystem = InMemory.create({ name: "accessfs-cache" });

  public constructor(handle: FileSystemDirectoryHandle) {
    super();
    this._handles.set("/", handle);
  }

  public metadata(): FileSystemMetadata {
    return {
      ...super.metadata(),
      name: "WebAccess",
    };
  }

  public async sync(path: string, data: Uint8Array, stats: Stats): Promise<void> {
    const currentStats = await this.stat(path);
    if (stats.mtime !== currentStats!.mtime) {
      await this.writeFile(path, data);
    }
  }

  public async rename(oldPath: string, newPath: string): Promise<void> {
    try {
      const handle = await this.getHandle(oldPath);
      if (handle instanceof FileSystemDirectoryHandle) {
        const files = await this.readdir(oldPath);

        await this.mkdir(newPath);
        if (files.length === 0) {
          await this.unlink(oldPath);
        } else {
          for (const file of files) {
            await this.rename(join(oldPath, file), join(newPath, file));
            await this.unlink(oldPath);
          }
        }
      }
      if (!(handle instanceof FileSystemFileHandle)) {
        return;
      }
      const oldFile = await handle.getFile();
      const destFolder = await this.getHandle(dirname(newPath));
      if (!(destFolder instanceof FileSystemDirectoryHandle)) {
        return;
      }
      const newFile = await destFolder.getFileHandle(basename(newPath), { create: true });
      const writable = await newFile.createWritable();
      await writable.write(await oldFile.arrayBuffer());

      writable.close();
      await this.unlink(oldPath);
      for (const key of this._handles.keys()) {
        if (key !== "/") {
          this._handles.delete(key);
        }
      }
    } catch (ex) {
      throw convertException(ex as ConvertException, oldPath, "rename");
    }
  }

  public async writeFile(fname: string, data: Uint8Array): Promise<void> {
    const handle = await this.getHandle(dirname(fname));
    if (!(handle instanceof FileSystemDirectoryHandle)) {
      return;
    }

    const file = await handle.getFileHandle(basename(fname), { create: true });
    const writable = await file.createWritable();
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    await writable.write(copy);
    await writable.close();
  }

  public async createFile(path: string, flag: string): Promise<PreloadFile<this>> {
    await this.writeFile(path, new Uint8Array());
    return this.openFile(path, flag);
  }

  public async stat(path: string): Promise<Stats> {
    const handle = await this.getHandle(path);
    if (!handle) {
      throw ErrnoError.With("ENOENT", path, "stat");
    }
    if (handle instanceof FileSystemDirectoryHandle) {
      return new Stats({ mode: 0o777 | zenfs.constants.S_IFDIR, size: 4096 });
    }
    if (handle instanceof FileSystemFileHandle) {
      const { lastModified, size } = await handle.getFile();
      return new Stats({ mode: 0o777 | zenfs.constants.S_IFREG, size, mtimeMs: lastModified });
    }
    throw new ErrnoError(Errno.EBADE, "Handle is not a directory or file", path, "stat");
  }

  public async openFile(path: string, flag: string): Promise<PreloadFile<this>> {
    const handle = await this.getHandle(path);
    if (!(handle instanceof FileSystemFileHandle)) {
      throw ErrnoError.With("EISDIR", path, "openFile");
    }
    try {
      const file = await handle.getFile();
      const data = new Uint8Array(await file.arrayBuffer());
      const stats = new Stats({ mode: 0o777 | zenfs.constants.S_IFREG, size: file.size, mtimeMs: file.lastModified });
      return new PreloadFile(this, path, flag, stats, data);
    } catch (ex) {
      throw convertException(ex as ConvertException, path, "openFile");
    }
  }

  public async unlink(path: string): Promise<void> {
    const handle = await this.getHandle(dirname(path));
    if (handle instanceof FileSystemDirectoryHandle) {
      try {
        await handle.removeEntry(basename(path), { recursive: true });
      } catch (ex) {
        throw convertException(ex as ConvertException, path, "unlink");
      }
    }
  }

  public async link(srcpath: string): Promise<void> {
    throw ErrnoError.With("ENOSYS", srcpath, "WebAccessFS.link");
  }

  public async rmdir(path: string): Promise<void> {
    return this.unlink(path);
  }

  public async mkdir(path: string): Promise<void> {
    const existingHandle = await this.getHandle(path);
    if (existingHandle) {
      throw ErrnoError.With("EEXIST", path, "mkdir");
    }

    const handle = await this.getHandle(dirname(path));
    if (!(handle instanceof FileSystemDirectoryHandle)) {
      throw ErrnoError.With("ENOTDIR", path, "mkdir");
    }
    await handle.getDirectoryHandle(basename(path), { create: true });
  }

  public async readdir(path: string): Promise<string[]> {
    const handle = await this.getHandle(path);
    if (!(handle instanceof FileSystemDirectoryHandle)) {
      throw ErrnoError.With("ENOTDIR", path, "readdir");
    }
    const _keys: string[] = [];
    for await (const key of handle.keys()) {
      _keys.push(key);
    }
    return _keys;
  }

  protected async getHandle(path: string): Promise<FileSystemHandle> {
    if (this._handles.has(path)) {
      return this._handles.get(path)!;
    }

    let walked = "/";

    for (const part of path.split("/").slice(1)) {
      const handle = this._handles.get(walked);
      if (!(handle instanceof FileSystemDirectoryHandle)) {
        throw ErrnoError.With("ENOTDIR", walked, "getHandle");
      }
      walked = join(walked, part);

      try {
        const dirHandle = await handle.getDirectoryHandle(part);
        this._handles.set(walked, dirHandle);
      } catch (_ex) {
        const ex = _ex as DOMException;
        if (ex.name == "TypeMismatchError") {
          try {
            const fileHandle = await handle.getFileHandle(part);
            this._handles.set(walked, fileHandle);
          } catch (ex) {
            convertException(ex as ConvertException, walked, "getHandle");
          }
        }

        if (ex.name === "TypeError") {
          throw new ErrnoError(Errno.ENOENT, ex.message, walked, "getHandle");
        }

        convertException(ex, walked, "getHandle");
      }
    }

    return this._handles.get(path)!;
  }
}

export const WebAccess = {
  name: "WebAccess",

  options: {
    handle: {
      type: "object",
      required: true,
      description: "The directory handle to use for the root",
    },
  },

  isAvailable(): boolean {
    return typeof FileSystemHandle === "function";
  },

  create(options: WebAccessOptions) {
    return new WebAccessFS(options.handle);
  },
} as const satisfies Backend<WebAccessFS, WebAccessOptions>;
