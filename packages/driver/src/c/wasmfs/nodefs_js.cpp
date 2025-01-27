#include <emscripten.h>
#include <cstdio>
#include "nodefs.h"

EM_ASYNC_JS(int, js_wasmfs_node_readdir, (const char *path, void *vec), {
    try {
        let entries = await Module.fs.promises.readdir(UTF8ToString(path), {withFileTypes: true});
        entries.forEach((entry) => {
                let sp = stackSave();
                let name = stringToUTF8OnStack(entry.name);
                let type;
                if (entry.isFile()) {
                    type = 1;
                } else if (entry.isDirectory()) {
                    type = 2;
                } else if (entry.isSymbolicLink()) {
                    type = 3;
                } else {
                    type = 0;
                }
                __wasmfs_node_record_dirent(vec, name, type);
                stackRestore(sp);
        });
    } catch (e) {
        console.error("readdir error", e);
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
})

int _wasmfs_node_readdir(const char* path, void* entries) {
    return js_wasmfs_node_readdir(path, entries);
}

EM_ASYNC_JS(int, js_wasmfs_node_get_mode, (const char *path, mode_t *mode), {
    let stat;
    try {
        // console.log("Stat file: ", UTF8ToString(path));
        stat = await Module.fs.promises.lstat(UTF8ToString(path));
    } catch (e) {
        // console.error("stat error", e);
        if (!e.code) throw e;
        return 1;
    }
    if (!stat) return 1;
    Module.setValue(mode, stat.mode, "i32");
    return 0;
})

int _wasmfs_node_get_mode(const char *path, mode_t *mode) {
    return js_wasmfs_node_get_mode(path, mode);
}

EM_ASYNC_JS(int, js_wasmfs_node_stat_size, (const char *path, uint32_t *size), {
    try {
        const stat = await Module.fs.promises.stat(UTF8ToString(path));
        Module.setValue(size, stat.size, "i32");
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_stat_size(const char* path, uint32_t* size) {
    return js_wasmfs_node_stat_size(path, size);
}

EM_ASYNC_JS(int, js_wasmfs_node_fstat_size, (int fd, uint32_t *size), {
    try {
        const stat = await Module.fs.promises.fstat(fd);
        Module.setValue(size, stat.size, "i32");
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_fstat_size(int fd, uint32_t* size) {
    return js_wasmfs_node_fstat_size(fd, size);
}

EM_ASYNC_JS(int, js_wasmfs_node_insert_file, (const char *path, mode_t mode), {
    try {
        const file = await Module.fs.promises.open(UTF8ToString(path), "ax", mode);
        await file.close();
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_insert_file(const char* path, mode_t mode) {
    return js_wasmfs_node_insert_file(path, mode);
}

EM_ASYNC_JS(int, js_wasmfs_node_insert_directory, (const char *path, mode_t mode), {
    try {
        await Module.fs.promises.mkdir(UTF8ToString(path), mode);
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_insert_directory(const char* path, mode_t mode) {
    return js_wasmfs_node_insert_directory(path, mode);
}

EM_ASYNC_JS(int, js_wasmfs_node_unlink, (const char *path), {
    try {
        await Module.fs.promises.unlink(UTF8ToString(path));
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_unlink(const char* path) {
    return js_wasmfs_node_unlink(path);
}

EM_ASYNC_JS(int, js_wasmfs_node_rmdir, (const char *path), {
    try {
        await Module.fs.promises.rmdir(UTF8ToString(path));
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_rmdir(const char* path) {
    return js_wasmfs_node_rmdir(path);
}

EM_ASYNC_JS(int, js_wasmfs_node_open, (const char *path, const char *mode), {
    let fd;
    try {
//        console.log("Opening file: ", UTF8ToString(path), "with mode", UTF8ToString(mode));
        fd = await Module.fs.promises.open(UTF8ToString(path), UTF8ToString(mode));
//        console.log("Opened file", UTF8ToString(path), "with mode", UTF8ToString(mode), "fd", fd);
    } catch (e) {
        console.error("open error", e);
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return fd.fd;
})

int _wasmfs_node_open(const char* path, const char* mode) {
    return js_wasmfs_node_open(path, mode);
}

EM_ASYNC_JS(int, js_wasmfs_node_close, (int fd), {
    try {
        await new Promise((resolve, reject) => {
            Module.fs.close(fd, (err, ok) => {
                if (err) {
                    console.error("close: error", err);
                    reject(err);
                } else {
//                    console.log("close(): ok");
                    resolve();
                }
            });
        });
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_close(int fd) {
    return js_wasmfs_node_close(fd);
}

EM_ASYNC_JS(int, js_wasmfs_node_read, (int fd, void *buf, uint32_t len, uint32_t pos, uint32_t *nread), {
    try {
        const r = await new Promise((resolve, reject) => {
        const buffer = new Uint8Array(len);
        Module.fs.read(fd,
                           buffer,
                           0, len, pos,
                           (err, bytesRead, buffer) => {
                               if (err) {
                                    console.error("Read error", err.code, err.message, err);
                                    resolve(err);
                               } else {
                                    Module.HEAPU8.set(buffer, buf);
                                    resolve(bytesRead);
                               }
                           });
        });
        Module.setValue(nread, r, "i32");
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_read(int fd, void *buf, uint32_t len, uint32_t pos, uint32_t *nread) {
    if (len > 0) {
        return js_wasmfs_node_read(fd, buf, len, pos, nread);
    } else {
        *nread = 0;
        return 0;
    }
}

EM_ASYNC_JS(int, js_wasmfs_node_write, (int fd, const void *buf, uint32_t len, uint32_t pos, uint32_t *nwritten), {
    try {
        const w = await new Promise((resolve, reject) => {
            const buffer = new Uint8Array(len);
            buffer.set(Module.HEAPU8.subarray(buf, buf + len));
            Module.fs.write(fd, buffer, 0, len, pos, (err, written) => {
                if (err) {
                    resolve(err);
                } else {
                    resolve(written);
                }
            });
        });
        Module.setValue(nwritten, w, "i32");
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_write(int fd, const void* buf, uint32_t len, uint32_t pos, uint32_t* nwritten) {
    if (len > 0) {
        return js_wasmfs_node_write(fd, buf, len, pos, nwritten);
    } else {
        *nwritten = 0;
        return 0;
    }
}

EM_ASYNC_JS(int, js_wasmfs_node_rename, (const char *oldPath, const char *newPath), {
    try {
        await Module.fs.promises.rename(UTF8ToString(oldPath), UTF8ToString(newPath));
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_rename(const char *oldPath, const char *newPath) {
    return js_wasmfs_node_rename(oldPath, newPath);
}

EM_ASYNC_JS(int, js_wasmfs_node_truncate, (const char *path, uint32_t size), {
    try {
        await new Promise((resolve, reject) => {
            Module.fs.truncate(UTF8ToString(path), size, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_truncate(const char* path, uint32_t size) {
    return js_wasmfs_node_truncate(path, size);
}

EM_ASYNC_JS(int, js_wasmfs_node_ftruncate, (int fd, uint32_t size), {
    try {
        await new Promise((resolve, reject) => {
            Module.fs.ftruncate(fd, size, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (e) {
        if (!e.code) throw e;
        return Module.ERRNO_CODES[e.code];
    }
    return 0;
})

int _wasmfs_node_ftruncate(int fd, uint32_t size) {
    return js_wasmfs_node_ftruncate(fd, size);
}