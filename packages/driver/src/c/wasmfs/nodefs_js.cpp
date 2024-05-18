#include <emscripten.h>
#include <cstdio>
#include "nodefs.h"

EM_ASYNC_JS(int, js_wasmfs_node_get_mode, (const char *path, mode_t *mode), {
    let stat;
    try {
        stat = await Module.fs.promises.lstat(UTF8ToString(path));
    } catch (e) {
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

EM_ASYNC_JS(int, js_wasmfs_node_open, (const char *path, const char *mode), {
    let fd;
    try {
        fd = await Module.fs.promises.open(UTF8ToString(path), UTF8ToString(mode));
        console.warn("Opened file", UTF8ToString(path), "with mode", UTF8ToString(mode), "fd", fd);
    } catch (e) {
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
                    console.log("close(): ok");
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

//EM_JS(int, js_wasmfs_node_read, (int fd, void *buf, uint32_t len, uint32_t pos, uint32_t *nread), {
//    console.warn("Reading", len, "bytes from fd", fd, "at pos", pos);
//    return Asyncify.handleSleep((wakeUp) => {
//        Module.fs.read(fd,
//                       new Int8Array(Module.HEAPU8.buffer, buf, len),
//                       0, len, pos,
//                       (err, bytesRead, buffer) => {
//                           if (err) {
//                               console.error("Read error", err.code, err.message, err);
//                               if (!err.code) throw err;
//                               wakeUp(Module.ERRNO_CODES[err.code]);
//                           } else {
//                               console.log("Read", bytesRead, "bytes from fd", fd, "at pos", pos);
//                               Module.setValue(nread, bytesRead, "i32");
//                               wakeUp(0);
//                           }
//                       });
//    });
//})
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
//                            const a = new TextDecoder().decode(buffer);
//                            console.log("read(): ok data=", a);
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
    return js_wasmfs_node_read(fd, buf, len, pos, nread);
}