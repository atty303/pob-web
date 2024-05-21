#include "lcurl.h"

#include <lauxlib.h>
#include <string.h>

typedef struct {
    char *headers;
    const char *url;
} Easy;

typedef struct {
    char message[1024];
} Error;

enum {
    OPT_URL = 10002,
    OPT_HTTPHEADER = 10023,
    OPT_USERAGENT = 10018,
    OPT_ACCEPT_ENCODING = 10102,
    OPT_POST = 10024,
    OPT_POSTFIELDS = 10015,
    OPT_IPRESOLVE = 113,
    OPT_PROXY = 10004,
    INFO_RESPONSE_CODE = 2097154,
};

static int lcurl_error_msg(lua_State *L) {
    Error *e = luaL_checkudata(L, 1, "lcurl_error");
    lua_pushstring(L, e->message);
    return 1;
}

static const struct luaL_Reg lcurl_error_methods[] = {
        {"msg", lcurl_error_msg},
        {NULL, NULL}
};

static int lcurl_error_new(lua_State *L, const char *msg) {
    Error *e = (Error *)lua_newuserdata(L, sizeof(Error));
    strncpy(e->message, msg, sizeof(e->message) - 1);
    e->message[sizeof(e->message) - 1] = '\0';

    luaL_getmetatable(L, "lcurl_error");
    lua_setmetatable(L, -2);

    return 1;
}

static int lcurl_easy_setopt(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");
    int option = luaL_checkinteger(L, 2);

//    if (option == CURLOPT_HTTPHEADER) {
//        luaL_checktype(L, 3, LUA_TTABLE);
//        lua_pushnil(L);
//        while (lua_next(L, 3) != 0) {
//            const char *header = luaL_checkstring(L, -1);
//            le->headers = curl_slist_append(le->headers, header);
//            lua_pop(L, 1);
//        }
//        curl_easy_setopt(le->curl, CURLOPT_HTTPHEADER, le->headers);
//    } else if (option == CURLOPT_URL) {
//        const char *url = luaL_checkstring(L, 3);
//        curl_easy_setopt(le->curl, CURLOPT_URL, url);
//    } else {
//        luaL_error(L, "Unsupported option");
//    }

    return 0;
}

static int lcurl_easy_setopt_headerfunction(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    return 0;
}

static int lcurl_easy_setopt_writefunction(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    return 0;
}

static int lcurl_easy_setopt_url(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    const char *url = luaL_checkstring(L, 2);
    le->url = url;

    return 0;
}

static int lcurl_easy_perform(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    lcurl_error_new(L, "Not implemented");

    lua_pushnil(L);
    lua_pushvalue(L, -2);

    return 2;
}

static int lcurl_easy_getinfo(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    return 0;
}

static int lcurl_easy_close(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");
    return 0;
}

static int lcurl_easy_gc(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");
    if (le->headers) {
    }
    return 0;
}

static const struct luaL_Reg lcurl_easy_methods[] = {
        {"setopt", lcurl_easy_setopt},
        {"setopt_url", lcurl_easy_setopt_url},
        {"setopt_headerfunction", lcurl_easy_setopt_headerfunction},
        {"setopt_writefunction", lcurl_easy_setopt_writefunction},
        {"perform", lcurl_easy_perform},
        {"getinfo", lcurl_easy_getinfo},
        {"close", lcurl_easy_close},
        {"__gc", lcurl_easy_gc},
        {NULL, NULL}
};

static int lcurl_easy_new(lua_State *L) {
    Easy *le = (Easy *)lua_newuserdata(L, sizeof(Easy));
    le->headers = NULL;

    luaL_getmetatable(L, "lcurl_easy");
    lua_setmetatable(L, -2);

    return 1;
}

static int lcurl_easy(lua_State *L) {
    return lcurl_easy_new(L);
}

// Register functions
static const struct luaL_Reg lcurl_functions[] = {
        {"easy", lcurl_easy},
        {NULL, NULL} // Sentinel
};

// Module initialization function
int luaopen_lcurl(lua_State *L) {
    luaL_newmetatable(L, "lcurl_error");
    lua_pushstring(L, "__index");
    lua_pushvalue(L, -2);
    lua_settable(L, -3);
    luaL_setfuncs(L, lcurl_error_methods, 0);

    luaL_newmetatable(L, "lcurl_easy");
    lua_pushstring(L, "__index");
    lua_pushvalue(L, -2);
    lua_settable(L, -3);
    luaL_setfuncs(L, lcurl_easy_methods, 0);

    luaL_newlib(L, lcurl_functions);

    lua_pushinteger(L, OPT_URL);
    lua_setfield(L, -2, "OPT_URL");
    lua_pushinteger(L, OPT_HTTPHEADER);
    lua_setfield(L, -2, "OPT_HTTPHEADER");
    lua_pushinteger(L, OPT_USERAGENT);
    lua_setfield(L, -2, "OPT_USERAGENT");
    lua_pushinteger(L, OPT_ACCEPT_ENCODING);
    lua_setfield(L, -2, "OPT_ACCEPT_ENCODING");
    lua_pushinteger(L, OPT_POST);
    lua_setfield(L, -2, "OPT_POST");
    lua_pushinteger(L, OPT_POSTFIELDS);
    lua_setfield(L, -2, "OPT_POSTFIELDS");
    lua_pushinteger(L, OPT_IPRESOLVE);
    lua_setfield(L, -2, "OPT_IPRESOLVE");
    lua_pushinteger(L, OPT_PROXY);
    lua_setfield(L, -2, "OPT_PROXY");
    lua_pushinteger(L, INFO_RESPONSE_CODE);
    lua_setfield(L, -2, "INFO_RESPONSE_CODE");

    return 1;
}

// Function to preload the module
void lcurl_register(lua_State *L) {
    lua_getglobal(L, "package");
    lua_getfield(L, -1, "preload");
    lua_pushcfunction(L, luaopen_lcurl);
    lua_setfield(L, -2, "lcurl.safe");
    lua_pop(L, 2); // pop package and preload tables
}
