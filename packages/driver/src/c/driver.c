#include <stdio.h>
#include <emscripten.h>
#include <emscripten/wasmfs.h>
#include <assert.h>
#include <string.h>
#include <zlib.h>
#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"
#include "draw.h"
#include "image.h"
#include "fs.h"
#include "sub.h"

extern backend_t wasmfs_create_nodefs_backend(const char* root);

extern const char *boot_lua;
static lua_State *GL;
static double st_start_time;

static void *my_alloc(void *ud, void *ptr, size_t osize, size_t nsize) {
    (void)ud;  (void)osize;  /* 未使用の引数 */
    if (nsize == 0) {
        free(ptr);
        return NULL;
    }
    else
        return realloc(ptr, nsize);
}

static int at_panic(lua_State *L) {
    fprintf(stderr, "Panic: %s\n", lua_tostring(L, -1));
    return 0;
}

static int OnError(lua_State *L) {
    EM_ASM({
               Module.onError(UTF8ToString($0));
           }, lua_tostring(L, -1));
    return 0;
}

static int push_callback(lua_State *L, const char *name) {
    lua_getfield(L, LUA_REGISTRYINDEX, "uicallbacks");
    lua_getfield(L, -1, name);
    if (lua_isfunction(L, -1)) {
        lua_remove(L, -2);
        return 0;
    } else {
        lua_pop(L, 1);
        lua_getfield(L, -1, "MainObject");
        lua_remove(L, -2);
        if (lua_istable(L, -1)) {
            lua_getfield(L, -1, name);
            if (lua_isfunction(L, -1)) {
                lua_insert(L, -2);
                return 1;
            } else {
                lua_pop(L, 1);
            }
        } else {
            lua_pop(L, 1);
        }
    }
    return -1;
}

static int SetCallback(lua_State *L) {
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

static int GetMainObject(lua_State *L) {
    lua_pushstring(L, "MainObject");
    lua_gettable(L, lua_upvalueindex(1));
    return 1;
}

static int GetTime(lua_State *L) {
    double t = emscripten_get_now() - st_start_time;
    lua_pushinteger(L, (int)t);
    return 1;
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

static int Copy(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *text = lua_tostring(L, 1);

    EM_ASM({
               Module.copy(UTF8ToString($0));
           }, text);
    return 0;
}

EM_ASYNC_JS(int, paste, (), {
    var text = await Module.paste();
    var lengthBytes = lengthBytesUTF8(text) + 1;
    var stringOnWasmHeap = Module._malloc(lengthBytes);
    stringToUTF8(text, stringOnWasmHeap, lengthBytes);
    return stringOnWasmHeap;
});

static int Paste(lua_State *L) {
    const char *text = (const char *)paste();
    lua_pushlstring(L, text, strlen(text));
    free((void *)text);
    return 1;
}

static int Deflate(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    z_stream strm;
    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    int ret = deflateInit(&strm, Z_BEST_COMPRESSION);
    if (ret != Z_OK) {
        lua_pushnil(L);
        lua_pushstring(L, "deflateInit failed");
        return 2;
    }

    size_t in_len;
    const char *in = lua_tolstring(L, 1, &in_len);

    // Prevent deflation of input data larger than 128 MiB.
    if (in_len > (128ull << 20)) {
        lua_pushnil(L);
        lua_pushstring(L, "Input larger than 128 MiB");
        return 2;
    }

    uLong out_sz = deflateBound(&strm, in_len);
    // Clamp deflate bound to a fairly reasonable 128 MiB.
    void *out = malloc(out_sz > (128ull << 20) ? (128ull << 20) : out_sz);
    strm.next_in = (Bytef *)in;
    strm.avail_in = in_len;
    strm.next_out = (Bytef *)out;
    strm.avail_out = out_sz;

    ret = deflate(&strm, Z_FINISH);
    deflateEnd(&strm);
    if (ret != Z_STREAM_END) {
        lua_pushnil(L);
        lua_pushstring(L, zError(ret));
        return 2;
    }

    lua_pushlstring(L, out, strm.total_out);
    free(out);
    return 1;
}

static int Inflate(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    z_stream strm;
    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    int ret = inflateInit(&strm);
    if (ret != Z_OK) {
        lua_pushnil(L);
        lua_pushstring(L, "inflateInit failed");
        return 2;
    }

    size_t in_len;
    const char *in = lua_tolstring(L, 1, &in_len);

    // Prevent inflation of input data larger than 128 MiB.
    if (in_len > (128ull << 20)) {
        lua_pushnil(L);
        lua_pushstring(L, "Input larger than 128 MiB");
        return 2;
    }

    uLong out_sz = in_len * 4;
    void *out = malloc(out_sz);
    strm.next_in = (Bytef *)in;
    strm.avail_in = in_len;
    strm.next_out = (Bytef *)out;
    strm.avail_out = out_sz;

    while ((ret = inflate(&strm, Z_NO_FLUSH)) == Z_OK) {
        if (strm.avail_out == 0) {
            out_sz *= 2;
            out = realloc(out, out_sz);
            strm.next_out = (Bytef *)((char *)out + strm.total_out);
            strm.avail_out = out_sz - strm.total_out;
        }
    }
    inflateEnd(&strm);
    if (ret != Z_STREAM_END) {
        lua_pushnil(L);
        lua_pushstring(L, zError(ret));
        return 2;
    }

    lua_pushlstring(L, out, strm.total_out);
    free(out);
    return 1;
}

static int OpenURL(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    assert(lua_isstring(L, 1));

    const char *url = lua_tostring(L, 1);

    EM_ASM({
               Module.openUrl(UTF8ToString($0));
           }, url);

    return 0;
}

static int DownloadPage(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 3);
    assert(lua_isstring(L, 1));
    assert(lua_isstring(L, 2) || lua_isnil(L, 2));
    assert(lua_isstring(L, 3) || lua_isnil(L, 3));

    const char *url = lua_tostring(L, 1);
    const char *header = lua_tostring(L, 2);
    const char *body = lua_tostring(L, 3);

    EM_ASM({
               Module.fetch(UTF8ToString($0), UTF8ToString($1), UTF8ToString($2));
           }, url, header, body);

    return 0;
}

EMSCRIPTEN_KEEPALIVE
int init() {
    backend_t app = wasmfs_create_nodefs_backend("");
    wasmfs_create_directory("/app", 0777, app);

    chdir("/app/root");

    GL = lua_newstate(my_alloc, NULL);
    lua_State *L = GL;

    luaL_openlibs(GL);  // 標準ライブラリを開く

    // Handle lua errors
    lua_atpanic(L, at_panic);

    lua_newtable(L);
    lua_rawseti(L, LUA_REGISTRYINDEX, 0);

    lua_pushcclosure(L, OnError, 0);
    lua_setglobal(L, "OnError");

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

    lua_pushvalue(L, -1);
    lua_pushcclosure(L, GetMainObject, 1);
    lua_setglobal(L, "GetMainObject");

    lua_setfield(L, LUA_REGISTRYINDEX, "uicallbacks");

    //
    image_init(L);
    draw_init(L);
    fs_init(L);
    sub_init(L);

    //
    lua_pushcclosure(L, GetTime, 0);
    lua_setglobal(L, "GetTime");

    lua_pushcclosure(L, GetCursorPos, 0);
    lua_setglobal(L, "GetCursorPos");

    lua_pushcclosure(L, IsKeyDown, 0);
    lua_setglobal(L, "IsKeyDown");

    lua_pushcclosure(L, Copy, 0);
    lua_setglobal(L, "Copy");

    lua_pushcclosure(L, Paste, 0);
    lua_setglobal(L, "Paste");

    lua_pushcclosure(L, Deflate, 0);
    lua_setglobal(L, "Deflate");

    lua_pushcclosure(L, Inflate, 0);
    lua_setglobal(L, "Inflate");

    lua_pushcclosure(L, OpenURL, 0);
    lua_setglobal(L, "OpenURL");

    // pob-web specific
    lua_pushcclosure(L, DownloadPage, 0);
    lua_setglobal(L, "DownloadPage");

    return 0;
}

EMSCRIPTEN_KEEPALIVE
int start() {
    lua_State *L = GL;

    st_start_time = emscripten_get_now();

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

    if (push_callback(L, "OnFrame") < 0) {
        return 1;
    }
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
int on_key_down(const char *name, int double_click) {
    lua_State *L = GL;
    if (push_callback(L, "OnKeyDown") < 0) {
        return 1;
    }
    lua_pushstring(L, name);
    lua_pushboolean(L, double_click);
    if (lua_pcall(L, 3, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int on_key_up(const char *name, int double_click) {
    lua_State *L = GL;
    if (push_callback(L, "OnKeyUp") < 0) {
        return 1;
    }
    lua_pushstring(L, name);
    if (double_click >= 0) {
        lua_pushboolean(L, double_click);
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

EMSCRIPTEN_KEEPALIVE
int on_char(const char *name, int double_click) {
    lua_State *L = GL;
    if (push_callback(L, "OnChar") < 0) {
        return 1;
    }
    lua_pushstring(L, name);
    lua_pushboolean(L, double_click);
    if (lua_pcall(L, 3, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int on_download_page_result(const char *json) {
    lua_State *L = GL;
    lua_getglobal(L, "OnDownloadPageResult");
    lua_pushstring(L, json);
    if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
        fprintf(stderr, "Error: %s\n", lua_tostring(L, -1));
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int on_subscript_finished(int id, const uint8_t *data) {
    lua_State *L = GL;

    int extra = push_callback(L, "OnSubFinished");
    if (extra >= 0) {
        lua_pushlightuserdata(L, (void *)id);
        int count = sub_lua_deserialize(L, data);
        if (lua_pcall(L, extra + 1 + count, 0, 0) != LUA_OK) {
            const char *msg = lua_tostring(L, -1);
            fprintf(stderr, "on_subscript_finished error: %s\n", msg);
            return 1;
        }
        return 0;
    }
    return 1;
}

// Call from main worker
EMSCRIPTEN_KEEPALIVE
int on_subscript_error(int id, const char *message) {
    lua_State *L = GL;

    int extra = push_callback(L, "OnSubError");
    if (extra >= 0) {
        lua_pushlightuserdata(L, (void *)id);
        lua_pushstring(L, message);
        if (lua_pcall(L, extra + 2, 0, 0) != LUA_OK) {
            const char *msg = lua_tostring(L, -1);
            fprintf(stderr, "on_subscript_error error: %s\n", msg);
            return 1;
        }
        return 0;
    }
    return 1;
}