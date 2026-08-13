#include <assert.h>
#include <stdio.h>
#include <dirent.h>
#include <string.h>
#include <sys/stat.h>
#include <libgen.h>
#include <fnmatch.h>
#include <unistd.h>

#include "fs.h"

static const char *FS_READDIR_HANDLE_TYPE = "FsReaddirHandle";

static int is_user_data(lua_State *L, int index, const char *type) {
    if (lua_type(L, index) != LUA_TUSERDATA) {
        return 0;
    }

    if (lua_getmetatable(L, index) == 0) {
        return 0;
    }

    lua_getfield(L, LUA_REGISTRYINDEX, type);
    int result = lua_rawequal(L, -2, -1);
    lua_pop(L, 2);

    return result;
}

static FsReaddirHandle *get_readdir_handle(lua_State *L, int valid) {
    assert(is_user_data(L, 1, FS_READDIR_HANDLE_TYPE));
    FsReaddirHandle *handle = lua_touserdata(L, 1);
    lua_remove(L, 1);
    if (valid) {
        assert(handle->dir != NULL);
    }
    return handle;
}

static int NewFileSearch(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *path = lua_tostring(L, 1);

    char _dirname[PATH_MAX];
    strncpy(_dirname, path, sizeof(_dirname) - 1);
    dirname(_dirname);

    char *pattern = basename((char *)path);

    DIR *dir = opendir(_dirname);
    if (dir == NULL) {
        fprintf(stderr, "Failed to open directory: %s\n", _dirname);
        return 0;
    }

    int dir_only = lua_toboolean(L, 2) != 0;
    struct dirent *entry;
    while (1) {
        entry = readdir(dir);
        if (entry == NULL) {
            closedir(dir);
            return 0;
        }

        if ((entry->d_type == DT_DIR) != dir_only || strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) {
            continue;
        }

        if (fnmatch(pattern, entry->d_name, FNM_FILE_NAME) != 0) {
            continue;
        }

        break;
    }

    FsReaddirHandle *handle = lua_newuserdata(L, sizeof(FsReaddirHandle));
    strncpy(handle->path, _dirname, sizeof(handle->path) - 1);
    strncpy(handle->pattern, pattern, sizeof(handle->pattern) - 1);
    handle->dir = dir;
    handle->entry = entry;
    handle->dir_only = dir_only;

    lua_pushvalue(L, lua_upvalueindex(1));
    lua_setmetatable(L, -2);

    return 1;
}

static int FsReaddirHandle_gc(lua_State *L) {
    FsReaddirHandle *handle = get_readdir_handle(L, 0);
    closedir(handle->dir);
    return 0;
}

static int FsReaddirHandle_NextFile(lua_State *L) {
    FsReaddirHandle *handle = get_readdir_handle(L, 1);

    struct dirent *entry;
    while (1) {
        entry = readdir(handle->dir);
        if (entry == NULL) {
            closedir(handle->dir);
            handle->dir = NULL;
            return 0;
        }

        if ((entry->d_type == DT_DIR) != handle->dir_only || strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) {
            continue;
        }

        if (fnmatch(handle->pattern, entry->d_name, FNM_FILE_NAME) != 0) {
            continue;
        }

        break;
    }

    handle->entry = entry;

    lua_pushboolean(L, 1);
    return 1;
}

static int FsReaddirHandle_GetFileName(lua_State *L) {
    FsReaddirHandle *handle = get_readdir_handle(L, 1);
    lua_pushstring(L, handle->entry->d_name);
    return 1;
}

static int FsReaddirHandle_GetFileSize(lua_State *L) {
    FsReaddirHandle *handle = get_readdir_handle(L, 1);
    lua_pushinteger(L, handle->entry->d_reclen);
    return 1;
}

static int FsReaddirHandle_GetFileModifiedTime(lua_State *L) {
    FsReaddirHandle *handle = get_readdir_handle(L, 1);

    char path[PATH_MAX];
    snprintf(path, sizeof(path) - 1, "%s/%s", handle->path, handle->entry->d_name);

    struct stat st;
    if (stat(path, &st) == 0) {
        lua_pushnumber(L, (double)st.st_mtime);
    } else {
        lua_pushnumber(L, 0);
    }
    return 1;
}

static int MakeDir(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *path = lua_tostring(L, 1);

    int ret = mkdir(path, 0777);
    if (ret != 0) {
        fprintf(stderr, "Failed to create directory: (%d) %s\n", ret, path);
        lua_pushnil(L);
        lua_pushstring(L, "Failed to create directory");
        return 2;
    }

    lua_pushboolean(L, 1);
    return 1;
}

static int RemoveDir(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *path = lua_tostring(L, 1);

    if (rmdir(path) != 0) {
        fprintf(stderr, "Failed to remove directory: %s\n", path);
        lua_pushnil(L);
        lua_pushstring(L, "Failed to remove directory");
        return 2;
    }

    lua_pushboolean(L, 1);
    return 1;
}

void fs_init(lua_State *L) {
    lua_newtable(L);
    lua_pushvalue(L, -1);
    lua_pushcclosure(L, NewFileSearch, 1);
    lua_setglobal(L, "NewFileSearch");

    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");

    lua_pushcfunction(L, FsReaddirHandle_gc);
    lua_setfield(L, -2, "__gc");

    lua_pushcfunction(L, FsReaddirHandle_NextFile);
    lua_setfield(L, -2, "NextFile");

    lua_pushcfunction(L, FsReaddirHandle_GetFileName);
    lua_setfield(L, -2, "GetFileName");

    lua_pushcfunction(L, FsReaddirHandle_GetFileSize);
    lua_setfield(L, -2, "GetFileSize");

    lua_pushcfunction(L, FsReaddirHandle_GetFileModifiedTime);
    lua_setfield(L, -2, "GetFileModifiedTime");

    lua_setfield(L, LUA_REGISTRYINDEX, FS_READDIR_HANDLE_TYPE);

    lua_pushcclosure(L, MakeDir, 0);
    lua_setglobal(L, "MakeDir");

    lua_pushcclosure(L, RemoveDir, 0);
    lua_setglobal(L, "RemoveDir");
}
