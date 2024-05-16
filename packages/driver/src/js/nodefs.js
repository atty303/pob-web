/**
 * @license
 * Copyright 2013 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 */

const O_RDONLY = 0;
const O_WRONLY = 1;
const O_RDWR = 2;
const O_CREAT = 64;
const O_EXCL = 128;
const O_TRUNC = 512;
const O_APPEND = 1024;
const O_SYNC = 0x101000;

const O_SUPPORTED = O_RDONLY | O_WRONLY | O_RDWR | O_CREAT | O_EXCL | O_TRUNC | O_APPEND | O_SYNC;

function assert(condition, msg) {}

const cDefs = {
  EINVAL: 28,
  SEEK_CUR: 1,
  SEEK_END: 2,
  // TODO: valid value?
  O_PATH: 0x200000,
  O_NONBLOCK: 0x800,
  O_LARGEFILE: 0x8000,
  O_CLOEXEC: 0x80000,
  O_DIRECTORY: 0x10000,
};

export const createNODEFS = (fs, FS, PATH, ERRNO_CODES) => {
  const NODEFS = {
    // $NODEFS__postset: 'if (ENVIRONMENT_IS_NODE) { NODEFS.staticInit(); }',
    isWindows: false,
    staticInit() {
      // NODEFS.isWindows = !!process.platform.match(/^win/);
      const flags = fs.constants;
      // Node.js 4 compatibility: it has no namespaces for constants
      // if (flags.fs) {
      //   flags = flags.fs;
      // }
      NODEFS.flagsForNodeMap = {
        1024: flags.O_APPEND,
        64: flags.O_CREAT,
        128: flags.O_EXCL,
        256: flags.O_NOCTTY,
        0: flags.O_RDONLY,
        2: flags.O_RDWR,
        4096: flags.O_SYNC,
        512: flags.O_TRUNC,
        1: flags.O_WRONLY,
        131072: flags.O_NOFOLLOW,
      };
      // The 0 define must match on both sides, as otherwise we would not
      // know to add it.
      assert(NODEFS.flagsForNodeMap["0"] === 0);
    },
    convertNodeCode(e) {
      const code = e.code;
      assert(code in ERRNO_CODES, `unexpected node error code: ${code} (${e})`);
      return ERRNO_CODES[code];
    },
    tryFSOperation(f) {
      try {
        return f();
      } catch (e) {
        if (!e.code) throw e;
        // node under windows can return code 'UNKNOWN' here:
        // https://github.com/emscripten-core/emscripten/issues/15468
        if (e.code === "UNKNOWN") throw new FS.ErrnoError(cDefs.EINVAL);
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e));
      }
    },
    mount(mount) {
      return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
    },
    createNode(parent, name, mode, dev) {
      if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
        throw new FS.ErrnoError(cDefs.EINVAL);
      }
      const node = FS.createNode(parent, name, mode);
      node.node_ops = NODEFS.node_ops;
      node.stream_ops = NODEFS.stream_ops;
      return node;
    },
    getMode(path) {
      let stat;
      return NODEFS.tryFSOperation(() => {
        stat = fs.lstatSync(path);
        // if (NODEFS.isWindows) {
        //     // Node.js on Windows never represents permission bit 'x', so
        //     // propagate read bits to execute bits
        //     stat.mode |= (stat.mode & {{{ cDefs.S_IRUSR | cDefs.S_IRGRP | cDefs.S_IROTH }}}) >> 2;
        // }
        return stat.mode;
      });
    },
    realPath(node) {
      const parts = [];
      while (node.parent !== node) {
        parts.push(node.name);
        node = node.parent;
      }
      parts.push(node.mount.opts.root);
      parts.reverse();
      return PATH.join(...parts);
    },
    // This maps the integer permission modes from http://linux.die.net/man/3/open
    // to node.js-specific file open permission strings at http://nodejs.org/api/fs.html#fs_fs_open_path_flags_mode_callback
    flagsForNode(flags) {
      flags &= ~cDefs.O_PATH; // Ignore this flag from musl, otherwise node.js fails to open the file.
      flags &= ~cDefs.O_NONBLOCK; // Ignore this flag from musl, otherwise node.js fails to open the file.
      flags &= ~cDefs.O_LARGEFILE; // Ignore this flag from musl, otherwise node.js fails to open the file.
      flags &= ~cDefs.O_CLOEXEC; // Some applications may pass it; it makes no sense for a single process.
      flags &= ~cDefs.O_DIRECTORY; // Node.js doesn't need this passed in, it errors.

      flags = flags & O_SUPPORTED;
      if (flags & O_RDWR && flags & O_CREAT) flags &= ~O_CREAT;
      if (flags === (O_WRONLY | O_CREAT)) flags |= O_TRUNC;

      let newFlags = 0;
      for (const k in NODEFS.flagsForNodeMap) {
        if (flags & k) {
          newFlags |= NODEFS.flagsForNodeMap[k];
          flags ^= k;
        }
      }
      if (flags) {
        throw new FS.ErrnoError(cDefs.EINVAL);
      }
      return newFlags;
    },

    node_ops: {
      getattr(node) {
        var path = NODEFS.realPath(node);
        var stat;
        NODEFS.tryFSOperation(() => (stat = fs.lstatSync(path)));
        // if (NODEFS.isWindows) {
        //     // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake
        //     // them with default blksize of 4096.
        //     // See http://support.microsoft.com/kb/140365
        //     if (!stat.blksize) {
        //         stat.blksize = 4096;
        //     }
        //     if (!stat.blocks) {
        //         stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
        //     }
        //     // Node.js on Windows never represents permission bit 'x', so
        //     // propagate read bits to execute bits.
        //     stat.mode |= (stat.mode & {{{ cDefs.S_IRUSR | cDefs.S_IRGRP | cDefs.S_IROTH }}}) >> 2;
        // }
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
      },
      setattr(node, attr) {
        var path = NODEFS.realPath(node);
        NODEFS.tryFSOperation(() => {
          if (attr.mode !== undefined) {
            fs.chmodSync(path, attr.mode);
            // update the common node structure mode as well
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            var date = new Date(attr.timestamp);
            fs.utimesSync(path, date, date);
          }
          if (attr.size !== undefined) {
            fs.truncateSync(path, attr.size);
          }
        });
      },
      lookup(parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        var mode = NODEFS.getMode(path);
        return NODEFS.createNode(parent, name, mode);
      },
      mknod(parent, name, mode, dev) {
        var node = NODEFS.createNode(parent, name, mode, dev);
        // create the backing node for this in the fs root as well
        var path = NODEFS.realPath(node);
        NODEFS.tryFSOperation(() => {
          if (FS.isDir(node.mode)) {
            // console.log("mkdirSync", path, node.mode);
            fs.mkdirSync(path, node.mode);
          } else {
            // console.log("writeFileSync", path, "", { mode: node.mode });
            fs.writeFileSync(path, "", { mode: node.mode });
          }
        });
        return node;
      },
      rename(oldNode, newDir, newName) {
        var oldPath = NODEFS.realPath(oldNode);
        var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
        NODEFS.tryFSOperation(() => fs.renameSync(oldPath, newPath));
        oldNode.name = newName;
      },
      unlink(parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        NODEFS.tryFSOperation(() => fs.unlinkSync(path));
      },
      rmdir(parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        NODEFS.tryFSOperation(() => fs.rmdirSync(path));
      },
      readdir(node) {
        var path = NODEFS.realPath(node);
        return NODEFS.tryFSOperation(() => fs.readdirSync(path));
      },
      symlink(parent, newName, oldPath) {
        var newPath = PATH.join2(NODEFS.realPath(parent), newName);
        NODEFS.tryFSOperation(() => fs.symlinkSync(oldPath, newPath));
      },
      readlink(node) {
        var path = NODEFS.realPath(node);
        return NODEFS.tryFSOperation(() => fs.readlinkSync(path));
      },
    },
    stream_ops: {
      open(stream) {
        var path = NODEFS.realPath(stream.node);
        NODEFS.tryFSOperation(() => {
          if (FS.isFile(stream.node.mode)) {
            stream.shared.refcount = 1;
            // console.log("openSync", path, NODEFS.flagsForNode(stream.flags));
            stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
          }
        });
      },
      close(stream) {
        NODEFS.tryFSOperation(() => {
          if (FS.isFile(stream.node.mode) && stream.nfd && --stream.shared.refcount === 0) {
            // console.log("closeSync", stream.nfd);
            fs.closeSync(stream.nfd);
          }
        });
      },
      dup(stream) {
        stream.shared.refcount++;
      },
      read(stream, buffer, offset, length, position) {
        // Node.js < 6 compatibility: node errors on 0 length reads
        if (length === 0) return 0;
        return NODEFS.tryFSOperation(() => {
          // fs.readSync(stream.nfd, new Int8Array(buffer.buffer, offset, length), 0, length, position),
          const buf = new Int8Array(length);
          // console.log("readSync", 0, length, position);
          const bytesRead = fs.readSync(stream.nfd, buf, 0, length, position);
          buffer.set(buf, offset);
          return bytesRead;
        });
      },
      write(stream, buffer, offset, length, position) {
        return NODEFS.tryFSOperation(() => {
          // fs.writeSync(stream.nfd, new Int8Array(buffer.buffer, offset, length), 0, length, position),
          if (length === 0) return 0;
          const buf = new Uint8Array(length);
          buf.set(buffer.subarray(offset, offset + length));
          console.log("write", 0, length, position);
          // console.log("write", new TextDecoder().decode(buf));
          return fs.writeSync(stream.nfd, buf, 0, length, position);
        });
      },
      llseek(stream, offset, whence) {
        var position = offset;
        if (whence === cDefs.SEEK_CUR) {
          position += stream.position;
        } else if (whence === cDefs.SEEK_END) {
          if (FS.isFile(stream.node.mode)) {
            NODEFS.tryFSOperation(() => {
              var stat = fs.fstatSync(stream.nfd);
              position += stat.size;
            });
          }
        }

        if (position < 0) {
          throw new FS.ErrnoError(cDefs.EINVAL);
        }

        return position;
      },
      // mmap(stream, length, position, prot, flags) {
      //   if (!FS.isFile(stream.node.mode)) {
      //     throw new FS.ErrnoError(cDefs.ENODEV);
      //   }
      //
      //   var ptr = mmapAlloc(length);
      //
      //   NODEFS.stream_ops.read(stream, HEAP8, ptr, length, position);
      //   return { ptr, allocated: true };
      // },
      // msync(stream, buffer, offset, length, mmapFlags) {
      //   NODEFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      //   // should we check if bytesWritten and length are the same?
      //   return 0;
      // },
    },
  };
  NODEFS.staticInit();
  return NODEFS;
};
