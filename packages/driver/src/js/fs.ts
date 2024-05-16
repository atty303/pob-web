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
