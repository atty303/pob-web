#include "sub.h"
#include "lauxlib.h"
#include "lualib.h"
#include <emscripten.h>
#include <assert.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum {
    TYPE_DOUBLE,
    TYPE_BOOLEAN,
    TYPE_STRING
} DataType;

typedef union {
    double doubleValue;
    int intValue;
    const char *stringValue; // NULL if not present
} DataValue;

typedef struct {
    DataType type;
    DataValue value;
} DataItem;

size_t serialize(DataItem *data, size_t count, unsigned char **buffer) {
    size_t totalSize = sizeof(size_t);
    for (size_t i = 0; i < count; ++i) {
        totalSize += sizeof(DataType);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                totalSize += sizeof(double);
                break;
            case TYPE_BOOLEAN:
                totalSize += sizeof(int);
                break;
            case TYPE_STRING:
                totalSize += sizeof(size_t) + (data[i].value.stringValue ? strlen(data[i].value.stringValue) + 1 : 0);
                break;
        }
    }

    *buffer = (unsigned char *)malloc(totalSize);
    unsigned char *ptr = *buffer;

    memcpy(ptr, &count, sizeof(size_t));
    ptr += sizeof(size_t);

    for (size_t i = 0; i < count; ++i) {
        memcpy(ptr, &data[i].type, sizeof(DataType));
        ptr += sizeof(DataType);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                memcpy(ptr, &data[i].value.doubleValue, sizeof(double));
                ptr += sizeof(float);
                break;
            case TYPE_BOOLEAN:
                memcpy(ptr, &data[i].value.intValue, sizeof(int));
                ptr += sizeof(int);
                break;
            case TYPE_STRING: {
                size_t stringLen = data[i].value.stringValue ? strlen(data[i].value.stringValue) + 1 : 0;
                memcpy(ptr, &stringLen, sizeof(size_t));
                ptr += sizeof(size_t);
                if (stringLen > 0) {
                    memcpy(ptr, data[i].value.stringValue, stringLen);
                    ptr += stringLen;
                }
                break;
            }
        }
    }

    return totalSize;
}

DataItem* deserialize(const unsigned char *buffer, size_t *count) {
    const unsigned char *ptr = buffer;

    memcpy(count, ptr, sizeof(size_t));
    ptr += sizeof(size_t);

    DataItem *data = (DataItem *)malloc(*count * sizeof(DataItem));
    for (size_t i = 0; i < *count; ++i) {
        memcpy(&data[i].type, ptr, sizeof(DataType));
        ptr += sizeof(DataType);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                memcpy(&data[i].value.doubleValue, ptr, sizeof(double));
                ptr += sizeof(float);
                break;
            case TYPE_BOOLEAN:
                memcpy(&data[i].value.intValue, ptr, sizeof(int));
                ptr += sizeof(int);
                break;
            case TYPE_STRING: {
                size_t stringLen;
                memcpy(&stringLen, ptr, sizeof(size_t));
                ptr += sizeof(size_t);
                if (stringLen > 0) {
                    data[i].value.stringValue = (char *)malloc(stringLen);
                    memcpy(data[i].value.stringValue, ptr, stringLen);
                    ptr += stringLen;
                } else {
                    data[i].value.stringValue = NULL;
                }
                break;
            }
        }
    }

    return data;
}

EM_ASYNC_JS(int, launch_sub_script, (const char *script, const char *funcs, const char *subs, size_t size, void *data), {
    try {
        return await Module.launchSubScript(UTF8ToString(script), UTF8ToString(funcs), UTF8ToString(subs), size, data);
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
        switch (lua_type(L, i + 4)) {
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
    lua_settop(L, offset - 1);
    return dataSize;
}

static void lua_deserialize(lua_State *L, const uint8_t *serializedData, size_t dataSize) {
    size_t dataCount;
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
    free(data);
}

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

EM_ASYNC_JS(void, abort_sub_script, (int id), {
    try {
        await Module.abortSubScript(id);
    } catch (e) {
        console.error("abort_sub_script error", e);
    }
})

static int AbortSubScript(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_islightuserdata(L, 1));

    int id = (int)lua_touserdata(L, 1);

    abort_sub_script(id);

    return 0;
}

static int IsSubScriptRunning(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_islightuserdata(L, 1));

    int id = (int)lua_touserdata(L, 1);

    int r = EM_ASM_INT({
        return Module.isSubScriptRunning($0);
    }, id);

    lua_pushboolean(L, r);

    return 1;
}

void sub_init(lua_State *L) {
    // SubScript
    lua_pushcclosure(L, LaunchSubScript, 0);
    lua_setglobal(L, "LaunchSubScript");

    lua_pushcclosure(L, AbortSubScript, 0);
    lua_setglobal(L, "AbortSubScript");

    lua_pushcclosure(L, IsSubScriptRunning, 0);
    lua_setglobal(L, "IsSubScriptRunning");
}

// Call from sub worker
EMSCRIPTEN_KEEPALIVE
int sub_start(const char *script, const char *funcs, const char *subs, size_t size, void *data) {
    lua_State *L = luaL_newstate();
    if (L == NULL) {
        return 1;
    }

    // TODO: lua_atpanic();

    luaL_openlibs(L);
    // TODO: os.exit()
    // TODO: ConPrintf

    int err = luaL_loadstring(L, script);
    if (err != LUA_OK) {
        return 2;
    }


}