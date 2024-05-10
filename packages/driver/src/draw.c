#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <emscripten.h>
#include "draw.h"
#include "lua.h"
#include "lauxlib.h"
#include "image.h"

static int st_layer = 0;

typedef enum {
    DRAW_SET_CLEAR_COLOR = 1,
    DRAW_SET_LAYER = 2,
    DRAW_SET_VIEWPORT = 3,
    DRAW_SET_COLOR = 4,
    DRAW_SET_COLOR_ESCAPE = 5,
    DRAW_IMAGE = 6,
    DRAW_IMAGE_QUAD = 7,
    DRAW_STRING = 8,
} DrawCommandType;

#pragma pack(push, 1)

typedef struct {
    uint8_t type;
    int16_t layer;
    int16_t sublayer;
} SetLayerCommand;

typedef struct {
    uint8_t type;
    int x, y, w, h;
} SetViewportCommand;

typedef struct {
    uint8_t type;
    uint8_t r, g, b, a;
} SetColorCommand;

typedef struct {
    uint8_t type;
    uint16_t text_size;
    char text[];
} SetColorEscapeCommand;

typedef struct {
    uint8_t type;
    int image_handle;
    float x, y, w, h;
    float s1, t1, s2, t2;
} DrawImageCommand;

typedef struct {
    uint8_t type;
    int image_handle;
    float x1, y1, x2, y2, x3, y3, x4, y4;
    float s1, t1, s2, t2, s3, t3, s4, t4;
} DrawImageQuadCommand;

typedef struct {
    uint8_t type;
    float x, y;
    uint8_t align;
    uint8_t height;
    uint8_t font;
    uint16_t text_size;
    char text[];
} DrawStringCommand;

#pragma pack(pop)

typedef struct {
    uint8_t *data;
    size_t size;
    size_t capacity;
} Buffer;

static Buffer st_buffer = {0};

static void draw_push(const void *data, size_t size) {
    if (st_buffer.size + size > st_buffer.capacity) {
        st_buffer.capacity = st_buffer.size + 65536;
        st_buffer.data = realloc(st_buffer.data, st_buffer.capacity);
    }
    memcpy(st_buffer.data + st_buffer.size, data, size);
    st_buffer.size += size;
}

void draw_begin() {
    st_buffer.data = NULL;
    st_buffer.size = 0;
    st_buffer.capacity = 0;
    st_layer = 0;
}

void draw_get_buffer(void **data, size_t *size) {
    *data = st_buffer.data;
    *size = st_buffer.size;
}

void draw_end() {
    free(st_buffer.data);
    st_buffer.data = NULL;
}

static int GetScreenSize(lua_State *L) {
    int width = EM_ASM_INT({
        return Module.getScreenWidth();
    });
    int height = EM_ASM_INT({
        return Module.getScreenHeight();
    });
    lua_pushinteger(L, width);
    lua_pushinteger(L, height);
    return 2;
}

static int SetDrawLayer(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    if (n >= 2) {
        assert(lua_isnumber(L, 2));
    }

    int layer = st_layer;
    int sublayer;
    if (lua_isnil(L, 1)) {
        assert(n >= 2);
        sublayer = lua_tointeger(L, 2);
    } else if (n >= 2) {
        layer = lua_tointeger(L, 1);
        sublayer = lua_tointeger(L, 2);
    } else {
        layer = lua_tointeger(L, 1);
        sublayer = 0;
    }

    if (layer < -32768 || layer >= 32768) {
        return luaL_error(L, "invalid layer %d", layer);
    }
    if (sublayer < -32768 || sublayer >= 32768) {
        return luaL_error(L, "invalid sublayer %d", sublayer);
    }

    st_layer = layer;

    SetLayerCommand cmd = {DRAW_SET_LAYER, layer, sublayer };
    draw_push(&cmd, sizeof(cmd));

    return 0;
}

static int SetViewport(lua_State *L) {
    int n = lua_gettop(L);
    if (n > 0) {
        assert(n >= 4);
        assert(lua_isnumber(L, 1));
        assert(lua_isnumber(L, 2));
        assert(lua_isnumber(L, 3));
        assert(lua_isnumber(L, 4));

        SetViewportCommand cmd = {DRAW_SET_VIEWPORT, lua_tointeger(L, 1), lua_tointeger(L, 2), lua_tointeger(L, 3),
                                  lua_tointeger(L, 4)};
        draw_push(&cmd, sizeof(cmd));
    } else {
        SetViewportCommand cmd = {DRAW_SET_VIEWPORT, 0, 0, 0, 0};
        draw_push(&cmd, sizeof(cmd));
    }

    return 0;
}

static void draw_set_color(float r, float g, float b, float a) {
    SetColorCommand cmd = {DRAW_SET_COLOR, (uint8_t )(r * 255), (uint8_t)(g * 255), (uint8_t)(b * 255), (uint8_t)(a * 255)};
    draw_push(&cmd, sizeof(cmd));
}

static void draw_set_color_escape(const char *text) {
    size_t text_size = strlen(text);
    SetColorEscapeCommand *cmd = malloc(sizeof(SetColorEscapeCommand) + text_size);
    cmd->type = DRAW_SET_COLOR_ESCAPE;
    cmd->text_size = text_size;
    strncpy(cmd->text, text, strlen(text));

    draw_push(cmd, sizeof(SetColorEscapeCommand) + text_size);
    free(cmd);
}

static int SetDrawColor(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 1);
    if (lua_type(L, 1) == LUA_TSTRING) {
        draw_set_color_escape(lua_tostring(L, 1));
    } else {
        assert(n >= 3);

        float alpha = 1.0f;
        if (n >= 4 && !lua_isnil(L, 4)) {
            alpha = lua_tonumber(L, 4);
        }
        draw_set_color(lua_tonumber(L, 1), lua_tonumber(L, 2), lua_tonumber(L, 3), alpha);
    }
    return 0;
}

static void draw_image(int image_handle, float x, float y, float w, float h, float s1, float t1, float s2, float t2) {
    DrawImageCommand cmd = {DRAW_IMAGE, image_handle, x, y, w, h, s1, t1, s2, t2};
    draw_push(&cmd, sizeof(cmd));
}

static int DrawImage(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 5);

    int handle = 0;
    if (!lua_isnil(L, 1)) {
        ImageHandle *image_handle = lua_touserdata(L, 1);
        handle = image_handle->handle;
    }
    if (n > 5) {
        draw_image(handle, lua_tonumber(L, 2), lua_tonumber(L, 3), lua_tonumber(L, 4), lua_tonumber(L, 5),
                   lua_tonumber(L, 6), lua_tonumber(L, 7), lua_tonumber(L, 8), lua_tonumber(L, 9));
    } else {
        draw_image(handle, lua_tonumber(L, 2), lua_tonumber(L, 3), lua_tonumber(L, 4), lua_tonumber(L, 5), 0.0f, 0.0f, 1.0f, 1.0f);
    }
    return 0;
}

static void draw_image_quad(int image_handle, float x1, float y1, float x2, float y2, float x3, float y3, float x4, float y4,
                            float s1, float t1, float s2, float t2, float s3, float t3, float s4, float t4) {
    DrawImageQuadCommand cmd = {DRAW_IMAGE_QUAD, image_handle, x1, y1, x2, y2, x3, y3, x4, y4, s1, t1, s2, t2, s3, t3, s4, t4};
    draw_push(&cmd, sizeof(cmd));
}

static int DrawImageQuad(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 9);

    int handle = 0;
    if (!lua_isnil(L, 1)) {
        ImageHandle *image_handle = lua_touserdata(L, 1);
        handle = image_handle->handle;
    }
    if (n > 9) {
        draw_image_quad(
                handle,
                lua_tonumber(L, 2), lua_tonumber(L, 3), lua_tonumber(L, 4), lua_tonumber(L, 5),
                lua_tonumber(L, 6), lua_tonumber(L, 7), lua_tonumber(L, 8), lua_tonumber(L, 9),
                lua_tonumber(L, 10), lua_tonumber(L, 11), lua_tonumber(L, 12), lua_tonumber(L, 13),
                lua_tonumber(L, 14), lua_tonumber(L, 15), lua_tonumber(L, 16), lua_tonumber(L, 17));
    } else {
        draw_image_quad(
                handle,
                lua_tonumber(L, 2), lua_tonumber(L, 3), lua_tonumber(L, 4), lua_tonumber(L, 5),
                lua_tonumber(L, 6), lua_tonumber(L, 7), lua_tonumber(L, 8), lua_tonumber(L, 9),
                0.0f, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, 0.0f, 1.0f);
    }
    return 0;
}

static const char *alignMap[6] = { "LEFT", "CENTER", "RIGHT", "CENTER_X", "RIGHT_X", NULL };
static const char *fontMap[4] = { "FIXED", "VAR", "VAR BOLD", NULL };

static int DrawString(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 6);
    assert(lua_isnumber(L, 1));
    assert(lua_isnumber(L, 2));
    assert(lua_isstring(L, 3) || lua_isnil(L, 3));
    assert(lua_isnumber(L, 4));
    assert(lua_isstring(L, 5));
    assert(lua_isstring(L, 6));

    const char *text = lua_tostring(L, 6);
    size_t text_size = strlen(text);
    DrawStringCommand *cmd = malloc(sizeof(DrawStringCommand) + text_size);
    cmd->type = DRAW_STRING;
    cmd->x = lua_tonumber(L, 1);
    cmd->y = lua_tonumber(L, 2);
    cmd->align = luaL_checkoption(L, 3, "LEFT", alignMap);
    cmd->height = lua_tointeger(L, 4); // TODO: check range
    cmd->font = luaL_checkoption(L, 5, "FIXED", fontMap);
    cmd->text_size = text_size;
    strncpy(cmd->text, text, strlen(text));

    draw_push(cmd, sizeof(DrawStringCommand) + text_size);
    free(cmd);

    return 0;
}

static int DrawStringWidth(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 3);
    assert(lua_isnumber(L, 1));
    assert(lua_isstring(L, 2));
    assert(lua_isstring(L, 3));

    int height = lua_tointeger(L, 1);
    int font = luaL_checkoption(L, 2, "FIXED", fontMap);
    const char *text = lua_tostring(L, 3);

    int width = EM_ASM_INT({
        return Module.getStringWidth($0, $1, UTF8ToString($2));
    }, height, font, text);

    lua_pushinteger(L, width);
    return 1;
}

static int DrawStringCursorIndex(lua_State *L) {
    int n = lua_gettop(L);
    assert(n >= 5);
    assert(lua_isnumber(L, 1));
    assert(lua_isstring(L, 2));
    assert(lua_isstring(L, 3));
    assert(lua_isnumber(L, 4));
    assert(lua_isnumber(L, 5));

    int size = lua_tointeger(L, 1);
    int font = luaL_checkoption(L, 2, "FIXED", fontMap);
    const char *text = lua_tostring(L, 3);
    int x = lua_tointeger(L, 4);
    int y = lua_tointeger(L, 5);

    int index = EM_ASM_INT({
        return Module.getStringCursorIndex($0, $1, UTF8ToString($2), $3, $4);
    }, size, font, text, x, y);

    lua_pushinteger(L, index);
    return 1;
}

void draw_init(lua_State *L) {
    lua_pushcclosure(L, GetScreenSize, 0);
    lua_setglobal(L, "GetScreenSize");

    lua_pushcclosure(L, SetDrawLayer, 0);
    lua_setglobal(L, "SetDrawLayer");

    lua_pushcclosure(L, SetViewport, 0);
    lua_setglobal(L, "SetViewport");

    lua_pushcclosure(L, SetDrawColor, 0);
    lua_setglobal(L, "SetDrawColor");

    lua_pushcclosure(L, DrawImage, 0);
    lua_setglobal(L, "DrawImage");

    lua_pushcclosure(L, DrawImageQuad, 0);
    lua_setglobal(L, "DrawImageQuad");

    lua_pushcclosure(L, DrawString, 0);
    lua_setglobal(L, "DrawString");

    lua_pushcclosure(L, DrawStringWidth, 0);
    lua_setglobal(L, "DrawStringWidth");

    lua_pushcclosure(L, DrawStringCursorIndex, 0);
    lua_setglobal(L, "DrawStringCursorIndex");
}