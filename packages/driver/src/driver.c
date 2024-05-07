#include <stdio.h>
#include <emscripten.h>
#include <assert.h>
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

static void push_callback(lua_State *L, const char *name) {
    lua_getfield(L, LUA_REGISTRYINDEX, "uicallbacks");
    lua_getfield(L, -1, "MainObject");
    lua_remove(L, -2);
    lua_getfield(L, -1, name);
    lua_insert(L, -2);
}

static int SetCallback(lua_State *L) {
    const char *name = lua_tostring(L, 1);
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));
    lua_pushvalue(L, 1);
    if (n >= 2) {
        assert(lua_isfunction(L, 2));
        lua_pushvalue(L, 2);
    } else {
        lua_pushnil(L);
    }
    lua_settable(L, lua_upvalueindex(1));
    return 0;
}

static int GetCallback(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));
    lua_pushvalue(L, 1);
    lua_gettable(L, lua_upvalueindex(1));
    return 1;
}

static int SetMainObject(lua_State *L) {
    int n = lua_gettop(L);
    lua_pushstring(L, "MainObject");
    if (n >= 1) {
        assert(lua_istable(L, 1) || lua_isnil(L, 1));
        lua_pushvalue(L, 1);
    } else {
        lua_pushnil(L);
    }
    lua_settable(L, lua_upvalueindex(1));
    return 0;
}

static int GetCursorPos(lua_State *L) {
    int x = EM_ASM_INT({ return Module.getCursorPosX(); });
    int y = EM_ASM_INT({ return Module.getCursorPosY(); });
    lua_pushinteger(L, x);
    lua_pushinteger(L, y);
    return 2;
}

static int IsKeyDown(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *name = lua_tostring(L, 1);
    int result = EM_ASM_INT({
                                return Module.isKeyDown(UTF8ToString($0));
                            }, name);
    lua_pushboolean(L, result);
    return 1;
}

EMSCRIPTEN_KEEPALIVE
int init() {
    GL = lua_newstate(my_alloc, NULL);
    lua_State *L = GL;

    luaL_openlibs(GL);  // 標準ライブラリを開く

    // Callbacks
    lua_newtable(L);

    lua_pushvalue(L, -1);
    lua_pushcclosure(L, SetCallback, 1);
    lua_setglobal(L, "SetCallback");

    lua_pushvalue(L, -1);
    lua_pushcclosure(L, GetCallback, 1);
    lua_setglobal(L, "GetCallback");

    lua_pushvalue(L, -1);
    lua_pushcclosure(L, SetMainObject, 1);
    lua_setglobal(L, "SetMainObject");

    lua_setfield(L, LUA_REGISTRYINDEX, "uicallbacks");

    //
    image_init(L);
    draw_init(L);

    //
    lua_pushcclosure(L, GetCursorPos, 0);
    lua_setglobal(L, "GetCursorPos");

    lua_pushcclosure(L, IsKeyDown, 0);
    lua_setglobal(L, "IsKeyDown");

    if (luaL_dostring(L, boot_lua) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }

    push_callback(L, "OnInit");
    if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }

    push_callback(L, "OnFrame");
    if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }

    return 0;
}

EMSCRIPTEN_KEEPALIVE
int on_frame() {
    lua_State *L = GL;

    draw_begin();

    push_callback(L, "OnFrame");
    if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
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

EMSCRIPTEN_KEEPALIVE
int on_key_down(const char *name, int repeat) {
    lua_State *L = GL;
    push_callback(L, "OnKeyDown");
    lua_pushstring(L, name);
    lua_pushboolean(L, repeat);
    if (lua_pcall(L, 3, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int on_key_up(const char *name, int repeat) {
    lua_State *L = GL;
    push_callback(L, "OnKeyUp");
    lua_pushstring(L, name);
    if (repeat >= 0) {
        lua_pushboolean(L, repeat);
        if (lua_pcall(L, 3, 0, 0) != LUA_OK) {
            fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
            return 1;
        }
    } else {
        if (lua_pcall(L, 2, 0, 0) != LUA_OK) {
            fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
            return 1;
        }
    }
    return 0;
}
