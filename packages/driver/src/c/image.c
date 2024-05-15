#include <assert.h>
#include <emscripten.h>
#include <string.h>
#include <stdio.h>
#include "image.h"
#include "util.h"

enum TextureFlags {
    TF_CLAMP = 0x01,
    TF_NOMIPMAP = 0x02,
    TF_NEAREST = 0x04,
};

// ---- VFS

typedef struct {
    char name[1024];
    int width;
    int height;
} VfsEntry;

static VfsEntry st_vfs_entries[1024];
static int st_vfs_count = 0;

static void parse_vfs_tsv() {
    FILE *f = fopen(".image.tsv", "r");
    if (f == NULL) {
        log_error("Failed to open .image.tsv");
        return;
    }

    char line[1024];
    while (fgets(line, sizeof(line), f) != NULL) {
        char name[1024];
        int width, height;
        if (strlen(line) < 1024) {
            sscanf(line, "%s\t%d\t%d", name, &width, &height);
            if (st_vfs_count < 1024) {
                strcpy(st_vfs_entries[st_vfs_count].name, name);
                st_vfs_entries[st_vfs_count].width = width;
                st_vfs_entries[st_vfs_count].height = height;
            }
        }
        st_vfs_count += 1;
    }

    fclose(f);
}

static VfsEntry *lookup_vfs_entry(const char *name) {
    for (int i = 0; i < st_vfs_count; i++) {
        if (strcmp(st_vfs_entries[i].name, name) == 0) {
            return &st_vfs_entries[i];
        }
    }
    return NULL;
}

// ----

static const char *IMAGE_HANDLE_TYPE = "ImageHandle";

static int st_next_handle = 0;

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

static ImageHandle *get_image_handle(lua_State *L) {
    assert(is_user_data(L, 1, IMAGE_HANDLE_TYPE));
    ImageHandle *image_handle = lua_touserdata(L, 1);
    lua_remove(L, 1);
    return image_handle;
}

static int NewImageHandle(lua_State *L) {
    ImageHandle *image_handle = lua_newuserdata(L, sizeof(ImageHandle));
    image_handle->handle = ++st_next_handle;
    image_handle->width = 1;
    image_handle->height = 1;

    lua_pushvalue(L, lua_upvalueindex(1));
    lua_setmetatable(L, -2);

    return 1;
}

static int ImageHandle_Load(lua_State *L) {
    ImageHandle *image_handle = get_image_handle(L);

    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *filename = lua_tostring(L, 1);

    VfsEntry *entry = lookup_vfs_entry(filename);
    if (entry != NULL) {
        image_handle->width = entry->width;
        image_handle->height = entry->height;
    }

    int flags = TF_NOMIPMAP;
    for (int f = 2; f <= n; ++f) {
        if (!lua_isstring(L, f)) {
            continue;
        }

        const char *flag = lua_tostring(L, f);
        if (!strcmp(flag, "ASYNC")) {
            // async texture loading removed
        } else if (!strcmp(flag, "CLAMP")) {
            flags |= TF_CLAMP;
        } else if (!strcmp(flag, "MIPMAP")) {
            flags &= ~TF_NOMIPMAP;
        } else if (!strcmp(flag, "NEAREST")) {
            flags |= TF_NEAREST;
        } else {
            assert(0);
        }
    }

    EM_ASM({
               Module.imageLoad($0, UTF8ToString($1), $2);
           }, image_handle->handle, filename, flags);

    return 0;
}

static int ImageHandle_ImageSize(lua_State *L) {
    ImageHandle *image_handle = get_image_handle(L);

    lua_pushinteger(L, image_handle->width);
    lua_pushinteger(L, image_handle->height);

    return 2;
}

void image_init(lua_State *L) {
    // Parse vfs.tsv
    parse_vfs_tsv();

    // Image handles
    lua_newtable(L);
    lua_pushvalue(L, -1);
    lua_pushcclosure(L, NewImageHandle, 1);
    lua_setglobal(L, "NewImageHandle");

    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");

    lua_pushcfunction(L, ImageHandle_Load);
    lua_setfield(L, -2, "Load");

    lua_pushcfunction(L, ImageHandle_ImageSize);
    lua_setfield(L, -2, "ImageSize");

    lua_setfield(L, LUA_REGISTRYINDEX, IMAGE_HANDLE_TYPE);
}
