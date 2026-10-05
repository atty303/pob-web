#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"
#include "lobject.h"

#include <math.h>
#include <stdio.h>
#include <stdlib.h>

#define CHECK(condition) \
    do { \
        if (!(condition)) { \
            fprintf(stderr, "CHECK failed: %s (%s:%d)\n", #condition, __FILE__, __LINE__); \
            exit(EXIT_FAILURE); \
        } \
    } while (0)

int luaopen_utf8(lua_State *L);

#ifndef LUA_NANTRICK
_Static_assert(sizeof(TValue) == 16, "The wasm32 original representation must occupy 16 bytes");
#endif

static void test_numbers(lua_State *L) {
    const double numbers[] = {0.0, -0.0, 1.0, -1.0, 0x1.fffffffffffffp+1023,
        0x1p-1074, 0x1.fffffffffffffp+52, INFINITY, -INFINITY, NAN};
    lua_newtable(L);
    for (unsigned i = 0; i < sizeof(numbers) / sizeof(numbers[0]); i++) {
        lua_pushnumber(L, numbers[i]);
        lua_rawseti(L, -2, i + 1);
    }
    lua_gc(L, LUA_GCCOLLECT, 0);
    for (unsigned i = 0; i < sizeof(numbers) / sizeof(numbers[0]); i++) {
        lua_rawgeti(L, -1, i + 1);
        CHECK(lua_type(L, -1) == LUA_TNUMBER);
        const double result = lua_tonumber(L, -1);
        if (isnan(numbers[i])) CHECK(isnan(result));
        else {
            CHECK(result == numbers[i]);
            CHECK(!!signbit(result) == !!signbit(numbers[i]));
        }
        lua_pop(L, 1);
    }
    lua_pop(L, 1);
}

static int read_upvalue(lua_State *L) {
    CHECK(lua_touserdata(L, lua_upvalueindex(1)) == lua_touserdata(L, 1));
    lua_pushnumber(L, 42.5);
    return 1;
}

static void test_c_closure(lua_State *L) {
    int token = 1;
    lua_pushlightuserdata(L, &token);
    lua_pushcclosure(L, read_upvalue, 1);
    lua_gc(L, LUA_GCCOLLECT, 0);
    lua_pushlightuserdata(L, &token);
    CHECK(lua_pcall(L, 1, 1, 0) == LUA_OK);
    CHECK(lua_tonumber(L, -1) == 42.5);
    lua_pop(L, 1);
    int *userdata = lua_newuserdata(L, sizeof(int));
    *userdata = 123;
    lua_gc(L, LUA_GCCOLLECT, 0);
    CHECK(*(int *)lua_touserdata(L, -1) == 123);
    lua_pop(L, 1);
}

int main(void) {
    lua_State *L = luaL_newstate();
    CHECK(L != NULL);
    luaL_openlibs(L);
    luaL_requiref(L, "utf8", luaopen_utf8, 1);
    lua_pop(L, 1);
    test_numbers(L);
    test_c_closure(L);
    const char *source =
        "local nan, inf = 0/0, 1/0; assert(nan ~= nan and inf == math.huge and -inf == -math.huge)\n"
        "local t, key = {}, {}; local function f() return 42 end\n"
        "t[key]=f; t[false]='boolean'; t[0]='zero'; t[1.5]='fraction'; t[9007199254740991]='precise'\n"
        "collectgarbage(); assert(t[key]()==42 and t[false]=='boolean' and t[-0.0]=='zero')\n"
        "assert(t[1.5]=='fraction' and t[9007199254740991]=='precise')\n"
        "assert(not pcall(function() t[nan]=1 end)); assert(1/(-0.0)==-math.huge)\n"
        "local captured={answer=42}; local function closure() return captured.answer end\n"
        "collectgarbage(); assert(closure()==42)\n"
        "local co=coroutine.create(function() coroutine.yield(t); return closure() end)\n"
        "local ok, result=coroutine.resume(co); assert(ok and result==t); collectgarbage()\n"
        "ok, result=coroutine.resume(co); assert(ok and result==42)\n"
        "assert(utf8.len('A\\195\\169\\240\\159\\152\\128')==3)\n"
        "assert(utf8.codepoint('\\195\\169')==233); assert(utf8.char(233)=='\\195\\169')\n"
        "local weak=setmetatable({}, {__mode='v'}); do local v={}; weak[1]=v end\n"
        "collectgarbage(); collectgarbage(); assert(weak[1]==nil)\n"
        "local sum=0; for i=1,10000 do local v={i,i/8,tostring(i)}; sum=sum+v[1]+v[2] end\n"
        "assert(sum==56255625)\n";
    if (luaL_dostring(L, source) != LUA_OK) {
        fprintf(stderr, "Lua value regression: %s\n", lua_tostring(L, -1));
        lua_close(L);
        return EXIT_FAILURE;
    }
    lua_gc(L, LUA_GCCOLLECT, 0);
    const int baseline_kib = lua_gc(L, LUA_GCCOUNT, 0);
    const int baseline_bytes = lua_gc(L, LUA_GCCOUNTB, 0);
    lua_createtable(L, 100000, 0);
    for (int i = 1; i <= 100000; i++) {
        lua_pushnumber(L, i * 0.125);
        lua_rawseti(L, -2, i);
    }
    lua_gc(L, LUA_GCCOLLECT, 0);
    const int allocation = (lua_gc(L, LUA_GCCOUNT, 0) - baseline_kib) * 1024
        + lua_gc(L, LUA_GCCOUNTB, 0) - baseline_bytes;
    printf("Lua values: %zu bytes; 100000-number array: %d additional Lua bytes\n", sizeof(TValue), allocation);
    for (int i = 1; i <= 100000; i++) {
        lua_rawgeti(L, -1, i);
        CHECK(lua_tonumber(L, -1) == i * 0.125);
        lua_pop(L, 1);
    }
    lua_close(L);
    puts("Lua numeric, tag, table, closure, coroutine, UTF-8 and GC tests passed");
    return EXIT_SUCCESS;
}
