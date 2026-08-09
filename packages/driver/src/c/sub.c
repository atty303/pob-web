#include "sub.h"
#include "sub_serialization.h"
#include "lauxlib.h"
#include "lualib.h"
#include "lcurl.h"
#include <emscripten.h>
#include <assert.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

EM_JS(int, launch_sub_script, (const char *script, const char *funcs, const char *subs, size_t size, void *data), {
    try {
        return Module.rpcCall("subscript_start", [UTF8ToString(script)], HEAPU8.slice(data, data + size)).value;
    } catch (e) {
        console.error("launch_sub_script error", e);
        return 0;
    }
})

static size_t lua_serialize(lua_State *L, int offset, uint8_t **serializedData) {
    int n = lua_gettop(L);
    size_t dataCount = n - offset + 1;
    DataItem *data = (DataItem *)malloc(dataCount * sizeof(DataItem));
    for (int i = 0; i < dataCount; ++i) {
        switch (lua_type(L, i + offset)) {
            case LUA_TNUMBER:
                data[i].type = TYPE_DOUBLE;
                data[i].value.doubleValue = lua_tonumber(L, i + offset);
                break;
            case LUA_TBOOLEAN:
                data[i].type = TYPE_BOOLEAN;
                data[i].value.intValue = lua_toboolean(L, i + offset);
                break;
            case LUA_TSTRING:
                data[i].type = TYPE_STRING;
                data[i].value.stringValue = lua_tostring(L, i + offset);
                break;
            case LUA_TNIL:
                data[i].type = TYPE_STRING;
                data[i].value.stringValue = NULL;
                break;
            default:
                assert(0);
        }
    }
    size_t dataSize = serialize(data, dataCount, serializedData);
    free(data);
    lua_settop(L, offset - 1);
    return dataSize;
}

int sub_lua_deserialize(lua_State *L, const uint8_t *serializedData) {
    int dataCount;
    DataItem *data = deserialize(serializedData, &dataCount);
    for (int i = 0; i < dataCount; ++i) {
        lua_checkstack(L, 1);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                lua_pushnumber(L, data[i].value.doubleValue);
                break;
            case TYPE_BOOLEAN:
                lua_pushboolean(L, data[i].value.intValue);
                break;
            case TYPE_STRING:
                if (data[i].value.stringValue) {
                    lua_pushstring(L, data[i].value.stringValue);
                } else {
                    lua_pushnil(L);
                }
                break;
        }
    }
    free_deserialized_data(data, dataCount);
    return dataCount;
}

// Call from main worker
static int LaunchSubScript(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 3);
    assert(lua_isstring(L, 1));
    assert(lua_isstring(L, 2));
    assert(lua_isstring(L, 3));

    const char *script = lua_tostring(L, 1);
    const char *funcs = lua_tostring(L, 2);
    const char *subs = lua_tostring(L, 3);

    uint8_t *serializedData;
    size_t dataSize = lua_serialize(L, 4, &serializedData);

    int r = launch_sub_script(script, funcs, subs, dataSize, serializedData);
    if (r > 0) {
        lua_pushlightuserdata(L, (void *)r);
    } else {
        lua_pushnil(L);
    }

    free(serializedData);

    return 1;
}

EM_JS(void, abort_sub_script, (int id), {
    Module.rpcCall("subscript_abort", [id]);
})

// Call from main worker
static int AbortSubScript(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_islightuserdata(L, 1));

    int id = (int)lua_touserdata(L, 1);

    abort_sub_script(id);

    return 0;
}

// Call from main worker
static int IsSubScriptRunning(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_islightuserdata(L, 1));

    int id = (int)lua_touserdata(L, 1);

    int r = EM_ASM_INT({ return Module.rpcCall("subscript_running", [$0]).value; }, id);
    lua_pushboolean(L, r);

    return 1;
}

// Call from main worker
void sub_init(lua_State *L) {
    // SubScript
    lua_pushcclosure(L, LaunchSubScript, 0);
    lua_setglobal(L, "LaunchSubScript");

    lua_pushcclosure(L, AbortSubScript, 0);
    lua_setglobal(L, "AbortSubScript");

    lua_pushcclosure(L, IsSubScriptRunning, 0);
    lua_setglobal(L, "IsSubScriptRunning");
}

static int panic_func(lua_State *L) {
    const char *msg = lua_tostring(L, -1);
    fprintf(stderr, "PANIC: unprotected error in call to Lua API (%s)\n", msg);
    return 0;
}

static int traceback (lua_State *L) {
    if (!lua_isstring(L, 1))  /* 'message' not a string? */
        return 1;  /* keep it intact */
    lua_getglobal(L, "debug");
    if (!lua_istable(L, -1)) {
        lua_pop(L, 1);
        return 1;
    }
    lua_getfield(L, -1, "traceback");
    if (!lua_isfunction(L, -1)) {
        lua_pop(L, 2);
        return 1;
    }
    lua_pushvalue(L, 1);  /* pass error message */
    lua_pushinteger(L, 2);  /* skip this function and traceback */
    lua_call(L, 2, 1);  /* call debug.traceback */
    return 1;
}

// TODO: use main worker's ConPrintf
static int ConPrintf(lua_State *L) {
    int n = lua_gettop(L);
    if (n < 1) {
        return luaL_error(L, "ConPrintf needs at least one argument");
    }

    const char *fmt = luaL_checkstring(L, 1);

    luaL_Buffer b;
    luaL_buffinit(L, &b);

    for (int i = 2; i <= n; i++) {
        lua_pushvalue(L, i);
        luaL_addvalue(&b);
    }

    luaL_pushresult(&b);
    const char *args = lua_tostring(L, -1);

    lua_getglobal(L, "string");
    lua_getfield(L, -1, "format");
    lua_remove(L, -2);  // remove the 'string' table from the stack

    lua_pushstring(L, fmt);
    lua_pushstring(L, args);

    if (lua_pcall(L, 2, 1, 0) != LUA_OK) {
        return luaL_error(L, "error calling 'string.format': %s", lua_tostring(L, -1));
    }

    const char *formatted = lua_tostring(L, -1);

    lua_getglobal(L, "print");
    lua_pushstring(L, formatted);

    if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
        return luaL_error(L, "error calling 'print': %s", lua_tostring(L, -1));
    }

    return 0;
}

// Call from sub worker
EMSCRIPTEN_KEEPALIVE
int sub_start(const char *script, const char *funcs, const char *subs, size_t size, void *data) {
    lua_State *L = luaL_newstate();
    if (L == NULL) {
        return 1;
    }

    lua_atpanic(L, panic_func);
    lua_pushcfunction(L, traceback);

    luaL_openlibs(L);
    // TODO: os.exit()
    lua_register(L, "ConPrintf", ConPrintf);

    lcurl_register(L);

    int err = luaL_loadstring(L, script);
    if (err != LUA_OK) {
        return 2;
    }

    int count = sub_lua_deserialize(L, data);

    if (lua_pcall(L, count, LUA_MULTRET, 1) != LUA_OK) {
        const char *msg = lua_tostring(L, -1);
        fprintf(stderr, "sub_start error: %s\n", msg);

        EM_ASM({
            Module.bridge.onSubScriptError(UTF8ToString($0));
        }, msg);

        return 3;
    }

    uint8_t *result;
    size_t result_size = lua_serialize(L, 2, &result);

    EM_ASM({
        Module.bridge.onSubScriptFinished($0, $1);
    }, result, result_size);

    free(result);

    return 0;
}
