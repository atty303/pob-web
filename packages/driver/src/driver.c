#include <stdio.h>
#include <emscripten.h>
#include <string.h>
#include "lua.h"
#include "lualib.h"

extern const char *boot_lua;
static lua_State *GL;

// メモリアロケーション関数
static void *my_alloc(void *ud, void *ptr, size_t osize, size_t nsize) {
    (void)ud;  (void)osize;  /* 未使用の引数 */
    if (nsize == 0) {
        free(ptr);
        return NULL;
    }
    else
        return realloc(ptr, nsize);
}

static const char *my_reader(lua_State *L, void *ud, size_t *size) {
    if (*(int *)ud == 0) return NULL;

    *(int *)ud = 0;
    *size = strlen(boot_lua);
    return boot_lua;
}

int init() {
    GL = lua_newstate(my_alloc, NULL);

    luaL_openlibs(GL);  // 標準ライブラリを開く

    static int read_state = 1;
    if (lua_load(GL, my_reader, &read_state, "boot.lua", NULL) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(GL, -1));
        return 1;
    }

    if (lua_pcall(GL, 0, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(GL, -1));
        return 1;
    }

    return 0;
}

int on_frame() {
    lua_getglobal(GL, "runCallback");
    lua_pushstring(GL, "OnFrame");
    if (lua_pcall(GL, 1, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(GL, -1));
        return 1;
    }
    return 0;
}
