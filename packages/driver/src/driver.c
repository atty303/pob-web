#include <stdio.h>
#include <emscripten.h>
#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"
#include "draw.h"
#include "image.h"

extern const char *boot_lua;
static lua_State *GL;

static void *my_alloc(void *ud, void *ptr, size_t osize, size_t nsize) {
    (void)ud;  (void)osize;  /* 未使用の引数 */
    if (nsize == 0) {
        free(ptr);
        return NULL;
    }
    else
        return realloc(ptr, nsize);
}

EMSCRIPTEN_KEEPALIVE
int init() {
    GL = lua_newstate(my_alloc, NULL);
    lua_State *L = GL;

    luaL_openlibs(GL);  // 標準ライブラリを開く

    image_init(L);
    draw_init(L);

    if (luaL_dostring(L, boot_lua) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }

    return 0;
}

EMSCRIPTEN_KEEPALIVE
int on_frame() {
    draw_begin();

    lua_getglobal(GL, "runCallback");
    lua_pushstring(GL, "OnFrame");
    if (lua_pcall(GL, 1, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(GL, -1));
        return 1;
    }

    void *buffer;
    size_t size;
    draw_get_buffer(&buffer, &size);
    EM_ASM({
               Module.drawCommit($0, $1);
           }, buffer, size);

    draw_end();

    return 0;
}
