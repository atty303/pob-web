import * as zenfs from "@zenfs/core";
import type { Ino } from "@zenfs/core";

export interface EmscriptenStats {
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  timestamp?: number;
}

export interface EmscriptenEntry {
  name: string;
  mode: number;
  parent: EmscriptenEntry;
  mount: { opts: { root: string } };
  stream_ops: EmscriptenStreamOps;
  node_ops: EmscriptenEntryOps;
}

export interface EmscriptenStream {
  node: EmscriptenEntry;
  nfd: any;
  flags: number;
  position: number;
}

export interface EmscriptenStreamOps {
  open(stream: EmscriptenStream): void;
  close(stream: EmscriptenStream): void;
  read(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number;
  write(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number;
  llseek(stream: EmscriptenStream, offset: number, whence: number): number;
}

export interface EmscriptenFS {
  node_ops: EmscriptenEntryOps;
  stream_ops: EmscriptenStreamOps;
  // mount(mount: { opts: { root: string } }): EmscriptenEntry;
  createNode(parent: EmscriptenEntry, name: string, mode: number, dev?: any): EmscriptenEntry;
  getMode(path: string): number;
  realPath(node: EmscriptenEntry): string;
}

export interface EmscriptenEntryOps {
  getattr(node: EmscriptenEntry): EmscriptenStats;
  setattr(node: EmscriptenEntry, attr: EmscriptenStats): void;
  lookup(parent: EmscriptenEntry, name: string): EmscriptenEntry;
  mknod(parent: EmscriptenEntry, name: string, mode: number, dev: any): EmscriptenEntry;
  rename(oldNode: EmscriptenEntry, newDir: EmscriptenEntry, newName: string): void;
  unlink(parent: EmscriptenEntry, name: string): void;
  rmdir(parent: EmscriptenEntry, name: string): void;
  readdir(node: EmscriptenEntry): string[];
  symlink(parent: EmscriptenEntry, newName: string, oldPath: string): void;
  readlink(node: EmscriptenEntry): string;
}

const O_RDONLY = 0;
const O_WRONLY = 1;
const O_RDWR = 2;
const O_CREAT = 64;
const O_EXCL = 128;
const O_TRUNC = 512;
const O_APPEND = 1024;
const O_SYNC = 0x101000;

const O_SUPPORTED = O_RDONLY | O_WRONLY | O_RDWR | O_CREAT | O_EXCL | O_TRUNC | O_APPEND | O_SYNC;

class NodeEmscriptenEntryOps implements EmscriptenEntryOps {
  private FS: any;
  private PATH: any;
  private ERRNO_CODES: any;
  private nodefs: any;

  constructor(
    private _fs: EmscriptenFS,
    nodefs: any,
    FS: any,
    PATH: any,
    ERRNO_CODES: any,
  ) {
    this.nodefs = nodefs;
    this.FS = FS;
    this.PATH = PATH;
    this.ERRNO_CODES = ERRNO_CODES;
  }

  public getattr(node: EmscriptenEntry): EmscriptenStats {
    const path = this._fs.realPath(node);
    let stat: any;
    try {
      stat = this.nodefs.lstatSync(path);
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
    return {
      dev: stat.dev,
      ino: stat.ino,
      mode: stat.mode,
      nlink: stat.nlink,
      uid: stat.uid,
      gid: stat.gid,
      rdev: stat.rdev,
      size: stat.size,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      blksize: stat.blksize,
      blocks: stat.blocks,
    };
  }

  public setattr(node: EmscriptenEntry, attr: EmscriptenStats): void {
    const path = this._fs.realPath(node);
    try {
      if (attr.mode !== undefined) {
        this.nodefs.chmodSync(path, attr.mode);
        // update the common node structure mode as well
        node.mode = attr.mode;
      }
      if (attr.timestamp !== undefined) {
        const date = new Date(attr.timestamp);
        this.nodefs.utimesSync(path, date, date);
      }
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      // Ignore not supported errors. Emscripten does utimesSync when it
      // writes files, but never really requires the value to be set.
      if (e.code !== "ENOTSUP") {
        throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
      }
    }
    if (attr.size !== undefined) {
      try {
        this.nodefs.truncateSync(path, attr.size);
      } catch (e: any) {
        if (!e.code) {
          throw e;
        }
        throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
      }
    }
  }

  public lookup(parent: EmscriptenEntry, name: string): EmscriptenEntry {
    const path = this.PATH.join2(this._fs.realPath(parent), name);
    const mode = this._fs.getMode(path);
    return this._fs.createNode(parent, name, mode);
  }

  public mknod(parent: EmscriptenEntry, name: string, mode: number, dev: any): EmscriptenEntry {
    const node = this._fs.createNode(parent, name, mode, dev);
    // create the backing node for this in the fs root as well
    const path = this._fs.realPath(node);
    try {
      if (this.FS.isDir(node.mode)) {
        this.nodefs.mkdirSync(path, node.mode);
      } else {
        this.nodefs.writeFileSync(path, "", { mode: node.mode });
      }
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
    return node;
  }

  public rename(oldNode: EmscriptenEntry, newDir: EmscriptenEntry, newName: string): void {
    const oldPath = this._fs.realPath(oldNode);
    const newPath = this.PATH.join2(this._fs.realPath(newDir), newName);
    try {
      this.nodefs.renameSync(oldPath, newPath);
      // This logic is missing from the original NodeFS,
      // causing Emscripten's filesystem to think that the old file still exists.
      oldNode.name = newName;
      oldNode.parent = newDir;
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public unlink(parent: EmscriptenEntry, name: string): void {
    const path = this.PATH.join2(this._fs.realPath(parent), name);
    try {
      this.nodefs.unlinkSync(path);
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public rmdir(parent: EmscriptenEntry, name: string) {
    const path = this.PATH.join2(this._fs.realPath(parent), name);
    try {
      this.nodefs.rmdirSync(path);
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public readdir(node: EmscriptenEntry): string[] {
    const path = this._fs.realPath(node);
    try {
      // Node does not list . and .. in directory listings,
      // but Emscripten expects it.
      const contents = this.nodefs.readdirSync(path);
      contents.push(".", "..");
      return contents;
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public symlink(parent: EmscriptenEntry, newName: string, oldPath: string): void {
    const newPath = this.PATH.join2(this._fs.realPath(parent), newName);
    try {
      this.nodefs.symlinkSync(oldPath, newPath);
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public readlink(node: EmscriptenEntry): string {
    const path = this._fs.realPath(node);
    try {
      return this.nodefs.readlinkSync(path);
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }
}

class NodeEmscriptenStreamOps implements EmscriptenStreamOps {
  private FS: any;
  private ERRNO_CODES: any;
  private nodefs: any;

  constructor(
    private efs: EmscriptenFS,
    nodefs: any,
    FS: any,
    ERRNO_CODES: any,
  ) {
    this.nodefs = nodefs;
    this.FS = FS;
    this.ERRNO_CODES = ERRNO_CODES;
  }

  public open(stream: EmscriptenStream): void {
    const path = this.efs.realPath(stream.node);
    const FS = this.FS;
    try {
      if (FS.isFile(stream.node.mode)) {
        let flags = stream.flags & O_SUPPORTED;
        if (flags & O_RDWR && flags & O_CREAT) flags &= ~O_CREAT;
        if (flags === (O_WRONLY | O_CREAT)) flags |= O_TRUNC;
        stream.nfd = this.nodefs.openSync(path, flags);
      }
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public close(stream: EmscriptenStream): void {
    const FS = this.FS;
    try {
      if (FS.isFile(stream.node.mode) && stream.nfd) {
        this.nodefs.closeSync(stream.nfd);
      }
    } catch (e: any) {
      if (!e.code) {
        throw e;
      }
      throw new FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public read(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number {
    // Avoid copying overhead by reading directly into buffer.
    try {
      return this.nodefs.readSync(stream.nfd, buffer, offset, length, position);
    } catch (e: any) {
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public write(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number {
    // Avoid copying overhead.
    try {
      return this.nodefs.writeSync(stream.nfd, buffer, offset, length, position);
    } catch (e: any) {
      throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
    }
  }

  public llseek(stream: EmscriptenStream, offset: number, whence: number): number {
    let position = offset;
    if (whence === 1) {
      // SEEK_CUR.
      position += stream.position;
    } else if (whence === 2) {
      // SEEK_END.
      if (this.FS.isFile(stream.node.mode)) {
        try {
          const stat = this.nodefs.fstatSync(stream.nfd);
          position += stat.size;
        } catch (e: any) {
          throw new this.FS.ErrnoError(this.ERRNO_CODES[e.code]);
        }
      }
    }

    if (position < 0) {
      throw new this.FS.ErrnoError(this.ERRNO_CODES.EINVAL);
    }

    stream.position = position;
    return position;
  }
}

export class NodeEmscriptenFS implements EmscriptenFS, Emscripten.FileSystemType {
  public node_ops: EmscriptenEntryOps;
  public stream_ops: EmscriptenStreamOps;

  // Emscripten runtime
  private fs: any;
  private path: any;
  private errnoCodes: any;

  private nodefs: any;

  constructor(fs: any, path: any, errnoCodes: any, nodefs: any) {
    this.fs = fs;
    this.path = path;
    this.errnoCodes = errnoCodes;
    this.nodefs = nodefs;
    this.node_ops = new NodeEmscriptenEntryOps(this, nodefs, fs, path, errnoCodes);
    this.stream_ops = new NodeEmscriptenStreamOps(this, nodefs, fs, errnoCodes);
  }

  mount(m: FS.Mount): FS.FSNode {
    return this.createNode(null, "/", this.getMode((m.opts as any).root), 0) as unknown as FS.FSNode;
  }

  syncfs(_mount: FS.Mount, _populate: () => unknown, _done: (err?: number | null) => unknown): void {}

  public createNode(parent: EmscriptenEntry | null, name: string, mode: number, _dev?: any): EmscriptenEntry {
    if (!this.fs.isDir(mode) && !this.fs.isFile(mode) && !this.fs.isLink(mode)) {
      throw new this.fs.ErrnoError(this.errnoCodes.EINVAL);
    }
    const node = this.fs.createNode(parent, name, mode);
    node.node_ops = this.node_ops;
    node.stream_ops = this.stream_ops;
    return node;
  }

  public getMode(path: string): number {
    try {
      return this.nodefs.lstatSync(path).mode;
    } catch (e: any) {
      if (e.code) throw new this.fs.ErrnoError(this.errnoCodes[e.code]);
      else throw e;
    }
  }

  public realPath(node: EmscriptenEntry): string {
    const parts: string[] = [];
    while (node.parent !== node) {
      parts.push(node.name);
      node = node.parent;
    }
    parts.push(node.mount.opts.root);
    parts.reverse();
    return this.path.join.apply(null, parts);
  }
}

export class SimpleAsyncStore implements zenfs.AsyncStore {
  get name() {
    return "SimpleAsyncStore";
  }

  constructor(
    readonly getCallback: (key: string) => Promise<Uint8Array | undefined>,
    readonly putCallback: (key: string, data: Uint8Array, overwrite: boolean) => Promise<boolean>,
    readonly removeCallback: (key: string) => Promise<void>,
  ) {}

  async clear(): Promise<void> {}

  beginTransaction(): zenfs.AsyncTransaction {
    return new SimpleAsyncTransaction(this.getCallback, this.putCallback, this.removeCallback);
  }
}

class SimpleAsyncTransaction implements zenfs.AsyncTransaction {
  /**
   * Stores data in the keys we modify prior to modifying them.
   * Allows us to roll back commits.
   */
  protected originalData: Map<Ino, Uint8Array | undefined> = new Map();
  /**
   * List of keys modified in this transaction, if any.
   */
  protected modifiedKeys: Set<Ino> = new Set();

  constructor(
    readonly getCallback: (key: string) => Promise<Uint8Array | undefined>,
    readonly putCallback: (key: string, data: Uint8Array, overwrite: boolean) => Promise<boolean>,
    readonly removeCallback: (key: string) => Promise<void>,
  ) {}

  async get(key: Ino): Promise<Uint8Array> {
    const val = await this.getCallback(key.toString());
    this.stashOldValue(key, val);
    return val as Uint8Array;
  }

  async put(key: Ino, data: Uint8Array, overwrite: boolean): Promise<boolean> {
    await this.markModified(key);
    return await this.putCallback(key.toString(), data, overwrite);
  }

  async remove(key: Ino): Promise<void> {
    await this.markModified(key);
    await this.removeCallback(key.toString());
  }

  async commit(): Promise<void> {
    /* NOP */
  }
  async abort(): Promise<void> {
    // Rollback old values.
    for (const key of this.modifiedKeys) {
      const value = this.originalData.get(key);
      if (!value) {
        // Key didn't exist.
        await this.removeCallback(key.toString());
      } else {
        // Key existed. Store old value.
        await this.putCallback(key.toString(), value, true);
      }
    }
  }

  /**
   * Stashes given key value pair into `originalData` if it doesn't already
   * exist. Allows us to stash values the program is requesting anyway to
   * prevent needless `get` requests if the program modifies the data later
   * on during the transaction.
   */
  protected stashOldValue(ino: Ino, value?: Uint8Array) {
    // Keep only the earliest value in the transaction.
    if (!this.originalData.has(ino)) {
      this.originalData.set(ino, value);
    }
  }

  /**
   * Marks the given key as modified, and stashes its value if it has not been
   * stashed already.
   */
  protected async markModified(ino: Ino) {
    this.modifiedKeys.add(ino);
    if (!this.originalData.has(ino)) {
      this.originalData.set(ino, await this.getCallback(ino.toString()));
    }
  }
}

export const SimpleAsyncFS = {
  name: "SimpleAsyncFS",
  options: {
    store: {
      type: "object",
      required: true,
      description: "Store to use for the filesystem",
    },
    lruCacheSize: {
      type: "number",
      required: false,
      description: "Size of the LRU cache to use",
    },
    sync: {
      type: "object",
      required: false,
      description: "Synchronous filesystem to use for the cache",
    },
  },

  isAvailable(): boolean {
    return true;
  },

  create(opts: zenfs.AsyncStoreOptions) {
    return new zenfs.AsyncStoreFS({
      store: opts.store,
      lruCacheSize: opts.lruCacheSize,
      sync: opts.sync,
    });
  },
} as const satisfies zenfs.Backend<zenfs.AsyncStoreFS, zenfs.AsyncStoreOptions>;
