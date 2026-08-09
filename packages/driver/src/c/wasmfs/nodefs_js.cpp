#include <emscripten.h>
#include <cstdio>
#include "nodefs.h"

EM_JS(int, rpc_readdir, (const char *path, void *vec), {
    try {
        const entries = Module.rpcCall("readdir", [UTF8ToString(path)]).value;
        for (const [entry, type] of entries) {
            const sp = stackSave();
            __wasmfs_node_record_dirent(vec, stringToUTF8OnStack(entry), type);
            stackRestore(sp);
        }
        return 0;
    } catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_readdir(const char *path, void *entries) { return rpc_readdir(path, entries); }

EM_JS(int, rpc_stat, (const char *op, const char *path, uint32_t *value, int field), {
    try {
        const stat = Module.rpcCall(UTF8ToString(op), [UTF8ToString(path)]).value;
        HEAPU32[value >> 2] = field ? stat.size : stat.mode;
        return 0;
    } catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_get_mode(const char *path, mode_t *mode) { return rpc_stat("lstat", path, mode, 0); }
int _wasmfs_node_stat_size(const char *path, uint32_t *size) { return rpc_stat("stat", path, size, 1); }

EM_JS(int, rpc_fstat_size, (int fd, uint32_t *size), {
    try { HEAPU32[size >> 2] = Module.rpcCall("fstat", [fd]).value.size; return 0; }
    catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_fstat_size(int fd, uint32_t *size) { return rpc_fstat_size(fd, size); }

EM_JS(int, rpc_path_mode, (const char *op, const char *path, mode_t mode), {
    try { Module.rpcCall(UTF8ToString(op), [UTF8ToString(path), mode]); return 0; }
    catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_insert_file(const char *path, mode_t mode) {
    int fd = _wasmfs_node_open(path, "ax");
    return fd < 0 ? -fd : _wasmfs_node_close(fd);
}
int _wasmfs_node_insert_directory(const char *path, mode_t mode) { return rpc_path_mode("mkdir", path, mode); }

EM_JS(int, rpc_path, (const char *op, const char *path), {
    try { Module.rpcCall(UTF8ToString(op), [UTF8ToString(path)]); return 0; }
    catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_unlink(const char *path) { return rpc_path("unlink", path); }
int _wasmfs_node_rmdir(const char *path) { return rpc_path("rmdir", path); }

EM_JS(int, rpc_open, (const char *path, const char *mode), {
    try { return Module.rpcCall("open", [UTF8ToString(path), UTF8ToString(mode)]).value; }
    catch (e) { return -(Module.ERRNO_CODES[e.code] || 5); }
});
int _wasmfs_node_open(const char *path, const char *mode) { return rpc_open(path, mode); }

EM_JS(int, rpc_fd, (const char *op, int fd), {
    try { Module.rpcCall(UTF8ToString(op), [fd]); return 0; }
    catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_close(int fd) { return rpc_fd("close", fd); }

EM_JS(int, rpc_read, (int fd, void *buf, uint32_t len, uint32_t pos, uint32_t *nread), {
    try {
        const result = Module.rpcCall("read", [fd, len, pos], undefined, len + 4096);
        if (result.data) HEAPU8.set(result.data, buf);
        HEAPU32[nread >> 2] = result.value;
        return 0;
    } catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_read(int fd, void *buf, uint32_t len, uint32_t pos, uint32_t *nread) {
    if (!len) { *nread = 0; return 0; }
    return rpc_read(fd, buf, len, pos, nread);
}

EM_JS(int, rpc_write, (int fd, const void *buf, uint32_t len, uint32_t pos, uint32_t *nwritten), {
    try {
        const result = Module.rpcCall("write", [fd, pos], HEAPU8.slice(buf, buf + len));
        HEAPU32[nwritten >> 2] = result.value;
        return 0;
    } catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_write(int fd, const void *buf, uint32_t len, uint32_t pos, uint32_t *nwritten) {
    if (!len) { *nwritten = 0; return 0; }
    return rpc_write(fd, buf, len, pos, nwritten);
}

EM_JS(int, rpc_rename, (const char *oldPath, const char *newPath), {
    try { Module.rpcCall("rename", [UTF8ToString(oldPath), UTF8ToString(newPath)]); return 0; }
    catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_rename(const char *oldPath, const char *newPath) { return rpc_rename(oldPath, newPath); }

EM_JS(int, rpc_resize, (const char *op, const char *path, int fd, uint32_t size), {
    try { Module.rpcCall(UTF8ToString(op), path ? [UTF8ToString(path), size] : [fd, size]); return 0; }
    catch (e) { return Module.ERRNO_CODES[e.code] || 5; }
});
int _wasmfs_node_truncate(const char *path, uint32_t size) { return rpc_resize("truncate", path, 0, size); }
int _wasmfs_node_ftruncate(int fd, uint32_t size) { return rpc_resize("ftruncate", nullptr, fd, size); }
