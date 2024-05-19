import * as zenfs from "@zenfs/core";
import type { Ino } from "@zenfs/core";

export class WebStorageStore implements zenfs.SimpleSyncStore {
  constructor(readonly _storage: Storage) {}

  async sync(): Promise<void> {}
  clearSync(): void {
    throw new Error("Method not implemented.");
  }
  transaction(): zenfs.Transaction {
    return new zenfs.SimpleTransaction(this);
  }

  get name(): string {
    return "WebStorageStore";
  }

  clear(): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  get(ino: Ino): Uint8Array | undefined {
    const data = this._storage.getItem(ino.toString());
    if (data) {
      return zenfs.encode(data);
    }
  }
  set(ino: Ino, data: Uint8Array): boolean {
    try {
      this._storage.setItem(ino.toString(), zenfs.decode(data));
      return true;
    } catch (e) {
      throw new zenfs.ErrnoError(zenfs.Errno.ENOSPC, "Storage is full.");
    }
  }
  delete(ino: Ino): void {
    try {
      this._storage.removeItem(ino.toString());
    } catch (e) {
      throw new zenfs.ErrnoError(zenfs.Errno.EIO, `Unable to delete key ${ino}: ${e}`);
    }
  }
}

export interface WebStorageOptions {
  storage?: Storage;
}

/**
 * A synchronous file system backed by a `Storage` (e.g. localStorage).
 */
export const WebStorage = {
  name: "WebStorage",

  options: {
    storage: {
      type: "object",
      required: false,
      description: "The Storage to use. Defaults to globalThis.localStorage.",
    },
  },

  isAvailable(storage: Storage = globalThis.localStorage): boolean {
    return storage instanceof globalThis.Storage;
  },

  create({ storage = globalThis.localStorage }: WebStorageOptions) {
    return new zenfs.StoreFS(new WebStorageStore(storage));
  },
} as const satisfies zenfs.Backend<zenfs.StoreFS, WebStorageOptions>;

// export class SimpleAsyncStore implements zenfs.AsyncStore {
//   get name() {
//     return "SimpleAsyncStore";
//   }
//
//   constructor(
//     readonly getCallback: (key: string) => Promise<Uint8Array | undefined>,
//     readonly putCallback: (key: string, data: Uint8Array, overwrite: boolean) => Promise<boolean>,
//     readonly removeCallback: (key: string) => Promise<void>,
//   ) {}
//
//   async clear(): Promise<void> {}
//
//   beginTransaction(): zenfs.AsyncTransaction {
//     return new SimpleAsyncTransaction(this.getCallback, this.putCallback, this.removeCallback);
//   }
// }
//
// class SimpleAsyncTransaction implements zenfs.AsyncTransaction {
//   /**
//    * Stores data in the keys we modify prior to modifying them.
//    * Allows us to roll back commits.
//    */
//   protected originalData: Map<Ino, Uint8Array | undefined> = new Map();
//   /**
//    * List of keys modified in this transaction, if any.
//    */
//   protected modifiedKeys: Set<Ino> = new Set();
//
//   constructor(
//     readonly getCallback: (key: string) => Promise<Uint8Array | undefined>,
//     readonly putCallback: (key: string, data: Uint8Array, overwrite: boolean) => Promise<boolean>,
//     readonly removeCallback: (key: string) => Promise<void>,
//   ) {}
//
//   async get(key: Ino): Promise<Uint8Array> {
//     const val = await this.getCallback(key.toString());
//     this.stashOldValue(key, val);
//     return val as Uint8Array;
//   }
//
//   async put(key: Ino, data: Uint8Array, overwrite: boolean): Promise<boolean> {
//     await this.markModified(key);
//     return await this.putCallback(key.toString(), data, overwrite);
//   }
//
//   async remove(key: Ino): Promise<void> {
//     await this.markModified(key);
//     await this.removeCallback(key.toString());
//   }
//
//   async commit(): Promise<void> {
//     /* NOP */
//   }
//   async abort(): Promise<void> {
//     // Rollback old values.
//     for (const key of this.modifiedKeys) {
//       const value = this.originalData.get(key);
//       if (!value) {
//         // Key didn't exist.
//         await this.removeCallback(key.toString());
//       } else {
//         // Key existed. Store old value.
//         await this.putCallback(key.toString(), value, true);
//       }
//     }
//   }
//
//   /**
//    * Stashes given key value pair into `originalData` if it doesn't already
//    * exist. Allows us to stash values the program is requesting anyway to
//    * prevent needless `get` requests if the program modifies the data later
//    * on during the transaction.
//    */
//   protected stashOldValue(ino: Ino, value?: Uint8Array) {
//     // Keep only the earliest value in the transaction.
//     if (!this.originalData.has(ino)) {
//       this.originalData.set(ino, value);
//     }
//   }
//
//   /**
//    * Marks the given key as modified, and stashes its value if it has not been
//    * stashed already.
//    */
//   protected async markModified(ino: Ino) {
//     this.modifiedKeys.add(ino);
//     if (!this.originalData.has(ino)) {
//       this.originalData.set(ino, await this.getCallback(ino.toString()));
//     }
//   }
// }

// export const SimpleAsyncFS = {
//   name: "SimpleAsyncFS",
//   options: {
//     store: {
//       type: "object",
//       required: true,
//       description: "Store to use for the filesystem",
//     },
//     lruCacheSize: {
//       type: "number",
//       required: false,
//       description: "Size of the LRU cache to use",
//     },
//     sync: {
//       type: "object",
//       required: false,
//       description: "Synchronous filesystem to use for the cache",
//     },
//   },
//
//   isAvailable(): boolean {
//     return true;
//   },
//
//   create(opts: zenfs.AsyncStoreOptions) {
//     return new zenfs.AsyncStoreFS({
//       store: opts.store,
//       lruCacheSize: opts.lruCacheSize,
//       sync: opts.sync,
//     });
//   },
// } as const satisfies zenfs.Backend<zenfs.AsyncStoreFS, zenfs.AsyncStoreOptions>;

import type { Backend, FileSystemMetadata } from "@zenfs/core";
import { Async, Errno, ErrnoError, FileSystem, FileType, InMemory, PreloadFile, Stats } from "@zenfs/core";
import { basename, dirname, join } from "@zenfs/core/emulation/path.js";

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
  error.cause = ex.cause;
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
  renameSync(oldPath: string, newPath: string, cred: zenfs.Cred): void {
    throw new Error("Method not implemented.");
  }
  statSync(path: string, cred: zenfs.Cred): zenfs.Stats {
    throw new Error("Method not implemented.");
  }
  openFileSync(path: string, flag: string, cred: zenfs.Cred): zenfs.File {
    throw new Error("Method not implemented.");
  }
  createFileSync(path: string, flag: string, mode: number, cred: zenfs.Cred): zenfs.File {
    throw new Error("Method not implemented.");
  }
  unlinkSync(path: string, cred: zenfs.Cred): void {
    throw new Error("Method not implemented.");
  }
  rmdirSync(path: string, cred: zenfs.Cred): void {
    throw new Error("Method not implemented.");
  }
  mkdirSync(path: string, mode: number, cred: zenfs.Cred): void {
    throw new Error("Method not implemented.");
  }
  readdirSync(path: string, cred: zenfs.Cred): string[] {
    throw new Error("Method not implemented.");
  }
  linkSync(srcpath: string, dstpath: string, cred: zenfs.Cred): void {
    throw new Error("Method not implemented.");
  }
  syncSync(path: string, data: Uint8Array, stats: Readonly<zenfs.Stats>): void {
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
        if (files.length == 0) {
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
      const oldFile = await handle.getFile(),
        destFolder = await this.getHandle(dirname(newPath));
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
      return new Stats({ mode: 0o777 | FileType.DIRECTORY, size: 4096 });
    }
    if (handle instanceof FileSystemFileHandle) {
      const { lastModified, size } = await handle.getFile();
      return new Stats({ mode: 0o777 | FileType.FILE, size, mtimeMs: lastModified });
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
      const stats = new Stats({ mode: 0o777 | FileType.FILE, size: file.size, mtimeMs: file.lastModified });
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
    return typeof FileSystemHandle == "function";
  },

  create(options: WebAccessOptions) {
    return new WebAccessFS(options.handle);
  },
} as const satisfies Backend<WebAccessFS, WebAccessOptions>;
