#include <lauxlib.h>
#include <lualib.h>
#include <stdio.h>

int main(void) {
    lua_State *L = luaL_newstate();
    if (L == NULL) {
        fprintf(stderr, "Failed to create Lua state for compound assignment tests\n");
        return 1;
    }
    luaL_openlibs(L);

    int status = luaL_dofile(L, "/luajit-compound-compat.lua");
    if (status != LUA_OK) {
        fprintf(stderr, "Lua compound assignment compatibility failed: %s\n", lua_tostring(L, -1));
    }
    lua_close(L);
    if (status != LUA_OK) return 1;

    puts("Lua compound assignment compatibility passed");
    return 0;
}
