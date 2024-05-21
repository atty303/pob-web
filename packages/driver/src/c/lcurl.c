#include "lcurl.h"

#include <emscripten.h>
#include <lauxlib.h>
#include <string.h>
#include <stdlib.h>

typedef struct {
    const char *url;
    char *headers;
    const char *body;
    int status_code;
    int header_function;
    int write_function;
} Easy;

typedef struct {
    char message[1024];
} Error;

enum {
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

    switch (option) {
        case OPT_HTTPHEADER: {
            luaL_checktype(L, 3, LUA_TTABLE);
            lua_pushnil(L);
            while (lua_next(L, 3) != 0) {
                const char *header = luaL_checkstring(L, -1);
                if (le->headers) {
                    size_t len = strlen(le->headers);
                    size_t header_len = strlen(header);
                    le->headers = realloc(le->headers, len + header_len + 3);
                    strcat(le->headers, header);
                    strcat(le->headers, "\r\n");
                } else {
                    le->headers = strdup(header);
                }
                lua_pop(L, 1);
            }
        }
        case OPT_USERAGENT: {
            const char *user_agent = luaL_checkstring(L, 3);
            const char *line = "User-Agent: ";
            le->headers = realloc(le->headers, strlen(le->headers) + strlen(user_agent) + strlen(line) + 3);
            strcat(le->headers, line);
            strcat(le->headers, user_agent);
            strcat(le->headers, "\r\n");
            break;
        }
        case OPT_ACCEPT_ENCODING: {
            const char *accept_encoding = luaL_checkstring(L, 3);
            if (strlen(accept_encoding) > 0) {
                const char *line = "Accept-Encoding: ";
                le->headers = realloc(le->headers, strlen(le->headers) + strlen(accept_encoding) + strlen(line) + 3);
                strcat(le->headers, line);
                strcat(le->headers, accept_encoding);
                strcat(le->headers, "\r\n");
            }
            break;
        }
        case OPT_POST: {
            // fetch will POST when the body is set
            break;
        }
        case OPT_POSTFIELDS: {
            const char *body = luaL_checkstring(L, 3);
            le->body = strdup(body);
            break;
        }
        case OPT_IPRESOLVE: {
            // no-op
            break;
        }
        case OPT_PROXY: {
            // no-op
            break;
        }
        default:
            luaL_error(L, "Option not supported");
            break;
    }
    return 0;
}

static int lcurl_easy_setopt_headerfunction(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    if (!lua_isfunction(L, 2)) {
        luaL_error(L, "Argument must be a function");
        return 0;
    }

    lua_pushvalue(L, 2);
    le->header_function = luaL_ref(L, LUA_REGISTRYINDEX);

    return 0;
}

static int lcurl_easy_setopt_writefunction(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    if (!lua_isfunction(L, 2)) {
        luaL_error(L, "Argument must be a function");
        return 0;
    }

    lua_pushvalue(L, 2);
    le->write_function = luaL_ref(L, LUA_REGISTRYINDEX);

    return 0;
}

static int lcurl_easy_setopt_url(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    const char *url = luaL_checkstring(L, 2);
    le->url = strdup(url);

    return 0;
}

EM_ASYNC_JS(const char *, fetch, (const char *url, const char *headers, const char *body), {
    const reqHeaders = headers ? UTF8ToString(headers) : undefined;
    const reqBody = body ? UTF8ToString(body) : undefined;

    const res = await Module.bridge.fetch(UTF8ToString(url), reqHeaders, reqBody);
    const j = JSON.parse(res);

    const resBody = ""+j.body;
    const status = ""+j.status;
    const header = ""+j.header;
    const error = ""+j.error;

    const buf = Module._malloc(resBody.length + status.length + header.length + error.length + 4);
    let p = buf;
    stringToUTF8(resBody, p, resBody.length + 1);
    p += resBody.length + 1;
    stringToUTF8(status, p, status.length + 1);
    p += status.length + 1;
    stringToUTF8(header, p, header.length + 1);
    p += header.length + 1;
    stringToUTF8(error, p, error.length + 1);
    p += error.length + 1;
    return buf;
})

static int lcurl_easy_perform(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    if (!le->url) {
        lcurl_error_new(L, "URL not set");
        lua_pushnil(L);
        lua_pushvalue(L, -2);
        return 2;
    }

    const char *response = fetch(le->url, le->headers, le->body);

    const char *p = response;
    const char *body = p;
    p += strlen(p) + 1;
    const char *status = p;
    p += strlen(p) + 1;
    const char *header = p;
    p += strlen(p) + 1;
    const char *error = p;

//    printf("body: %s\nstatus: %s\nheader: %s\nerror: %s\n", body, status, header, error);

    le->status_code = 0;

    if (strcmp(error, "undefined") != 0) {
//        printf("error is defined, returning error\n");
        lcurl_error_new(L, error);
        lua_pushnil(L);
        lua_pushvalue(L, -2);
        free((void *)response);
        return 2;
    }

    if (strlen(status) > 0) {
        le->status_code = strtol(status, NULL, 10);
//        printf("status code: %d\n", le->status_code);
    }

    if (le->header_function != LUA_REFNIL) {
        lua_rawgeti(L, LUA_REGISTRYINDEX, le->header_function);
        lua_pushstring(L, header);
        if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
//            printf("error calling header function\n");
            lcurl_error_new(L, lua_tostring(L, -1));
            lua_pushnil(L);
            lua_pushvalue(L, -2);
            free((void *)response);
            return 2;
        }
    }

    if (le->write_function != LUA_REFNIL) {
        lua_rawgeti(L, LUA_REGISTRYINDEX, le->write_function);
        lua_pushstring(L, body);
        if (lua_pcall(L, 1, 0, 0) != LUA_OK) {
//            printf("error calling write function\n");
            lcurl_error_new(L, lua_tostring(L, -1));
            lua_pushnil(L);
            lua_pushvalue(L, -2);
            free((void *)response);
            return 2;
        }
    }

    lua_pushnil(L);
    lua_pushnil(L);
    return 2;
}

static int lcurl_easy_getinfo(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    int option = luaL_checkinteger(L, 2);
    switch (option) {
        case INFO_RESPONSE_CODE:
            lua_pushinteger(L, le->status_code);
            return 1;
        default:
            return 0;
    }
}

static int lcurl_easy_getinfo_response_code(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    lua_pushinteger(L, le->status_code);
    return 1;
}

static int lcurl_easy_close(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");
    if (le->url) {
        free((void *)le->url);
        le->url = NULL;
    }
    if (le->headers) {
        free((void *)le->headers);
        le->headers = NULL;
    }
    if (le->body) {
        free((void *)le->body);
        le->body = NULL;
    }
    if (le->header_function != LUA_REFNIL) {
        luaL_unref(L, LUA_REGISTRYINDEX, le->header_function);
        le->header_function = LUA_REFNIL;
    }
    if (le->write_function != LUA_REFNIL) {
        luaL_unref(L, LUA_REGISTRYINDEX, le->write_function);
        le->write_function = LUA_REFNIL;
    }
    return 0;
}

static int lcurl_easy_gc(lua_State *L) {
    Easy *le = luaL_checkudata(L, 1, "lcurl_easy");

    lcurl_easy_close(L);

    return 0;
}

static const struct luaL_Reg lcurl_easy_methods[] = {
        {"setopt", lcurl_easy_setopt},
        {"setopt_url", lcurl_easy_setopt_url},
        {"setopt_headerfunction", lcurl_easy_setopt_headerfunction},
        {"setopt_writefunction", lcurl_easy_setopt_writefunction},
        {"perform", lcurl_easy_perform},
        {"getinfo", lcurl_easy_getinfo},
        {"getinfo_response_code", lcurl_easy_getinfo_response_code},
        {"close", lcurl_easy_close},
        {"__gc", lcurl_easy_gc},
        {NULL, NULL}
};

static int lcurl_easy_new(lua_State *L) {
    Easy *le = (Easy *)lua_newuserdata(L, sizeof(Easy));
    le->url = NULL;
    le->headers = strdup("");
    le->body = NULL;
    le->status_code = 0;
    le->header_function = LUA_REFNIL;
    le->write_function = LUA_REFNIL;

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
