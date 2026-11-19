#include "draw.h"
#include "dpi.h"
#include "text_width_cache.h"
#include "lauxlib.h"
#include "lualib.h"

#include <emscripten.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(condition) \
    do { \
        if (!(condition)) { \
            fprintf(stderr, "CHECK failed: %s (%s:%d)\n", #condition, __FILE__, __LINE__); \
            exit(EXIT_FAILURE); \
        } \
    } while (0)

static void test_text_width_cache_bounds(void) {
    text_width_cache_reset(true);
    int width;
    // Release Lua argument assertions are disabled. The existing bridge maps
    // a null text pointer to an empty JS string; caching must defer to it.
    width = 777;
    CHECK(!text_width_cache_get(14, 1, NULL, &width) && width == 777);
    text_width_cache_put(14, 1, NULL, 0);
    CHECK(text_width_cache_profile().entries == 0 && text_width_cache_profile().bypasses == 1);
    for (int height = 1; height <= 2; height++) {
        text_width_cache_put(height, 1, "tiny font", 10);
        CHECK(!text_width_cache_get(height, 1, "tiny font", &width));
    }
    CHECK(text_width_cache_profile().entries == 0 && text_width_cache_profile().bypasses == 3);
    char *temporary = malloc(32);
    strcpy(temporary, "owned Lua-independent text");
    text_width_cache_put(14, 1, temporary, 42);
    memset(temporary, 'x', 25);
    free(temporary);
    CHECK(text_width_cache_get(14, 1, "owned Lua-independent text", &width) && width == 42);
    CHECK(!text_width_cache_get(16, 1, "owned Lua-independent text", &width));
    CHECK(!text_width_cache_get(14, 2, "owned Lua-independent text", &width));
    // These strings have identical FNV-1a hashes. Equality must still compare
    // owned bytes rather than treating the hash as a unique string identity.
    text_width_cache_put(14, 1, "costarring", 100);
    text_width_cache_put(14, 1, "liquid", 200);
    CHECK(text_width_cache_get(14, 1, "costarring", &width) && width == 100);
    CHECK(text_width_cache_get(14, 1, "liquid", &width) && width == 200);

    // Numerous independently hashed keys exercise chains and exact equality.
    text_width_cache_reset(true);
    char key[32];
    for (int i = 0; i < TEXT_WIDTH_CACHE_MAX_ENTRIES; i++) {
        snprintf(key, sizeof(key), "entry-%d", i);
        text_width_cache_put(14, 1, key, i);
    }
    for (int i = 0; i < TEXT_WIDTH_CACHE_MAX_ENTRIES; i++) {
        snprintf(key, sizeof(key), "entry-%d", i);
        CHECK(text_width_cache_get(14, 1, key, &width) && width == i);
    }
    CHECK(text_width_cache_get(14, 1, "entry-0", &width));
    text_width_cache_put(14, 1, "overflow", -123);
    CHECK(text_width_cache_get(14, 1, "entry-0", &width) && width == 0);
    CHECK(!text_width_cache_get(14, 1, "entry-1", &width));
    CHECK(text_width_cache_get(14, 1, "overflow", &width) && width == -123);
    TextWidthCacheProfile profile = text_width_cache_profile();
    CHECK(profile.entries == TEXT_WIDTH_CACHE_MAX_ENTRIES && profile.evictions == 1);

    text_width_cache_reset(true);
    temporary = malloc(TEXT_WIDTH_CACHE_MAX_TEXT_BYTES + 1);
    memset(temporary, 'a', TEXT_WIDTH_CACHE_MAX_TEXT_BYTES);
    temporary[300000] = '\0';
    for (int i = 0; i < 4; i++) {
        temporary[0] = 'a' + i;
        text_width_cache_put(14, 1, temporary, i);
        profile = text_width_cache_profile();
        CHECK(profile.text_bytes <= TEXT_WIDTH_CACHE_MAX_TEXT_BYTES);
    }
    CHECK(profile.entries == 3 && profile.evictions == 1);
    CHECK(text_width_cache_get(14, 1, temporary, &width) && width == 3);
    temporary[0] = 'a';
    CHECK(!text_width_cache_get(14, 1, temporary, &width));
    temporary[300000] = 'a';
    temporary[TEXT_WIDTH_CACHE_MAX_TEXT_BYTES] = '\0';
    text_width_cache_put(14, 1, temporary, 99);
    CHECK(text_width_cache_profile().entries == 3);
    CHECK(text_width_cache_profile().bypasses == 1);
    free(temporary);
    text_width_cache_fail_allocation = 1;
    text_width_cache_put(14, 1, "allocation failure", 1);
    text_width_cache_fail_allocation = 0;
    CHECK(!text_width_cache_get(14, 1, "allocation failure", &width));
    CHECK(text_width_cache_profile().bypasses == 2);
    text_width_cache_reset(false);
    profile = text_width_cache_profile();
    CHECK(profile.entries == 0 && profile.text_bytes == 0 && !profile.enabled);
    text_width_cache_put(14, 1, "disabled", 10);
    CHECK(!text_width_cache_get(14, 1, "disabled", &width));
    CHECK(text_width_cache_profile().entries == 0);
}

static void test_draw_string_width_cache(void) {
    EM_ASM({
        Module.nativeTextWidthCacheEnabled = true;
        Module.scale = 2;
        Module.widthCalls = [];
        Module.getScreenScale = () => Module.scale;
        Module.getStringWidth = (height, font, text) => {
            Module.widthCalls.push({height, font, text});
            return text.length * height + font * 100;
        };
    });
    lua_State *L = luaL_newstate();
    CHECK(L != NULL);
    luaL_openlibs(L);
    draw_init(L);
    dpi_render_init("DPI_AWARE");
    dpi_set_override_percent(0);
    draw_begin();
    CHECK(luaL_dostring(L,
        "assert(DrawStringWidth(14,'FIXED','abc') == 42)\n"
        "for i=1,1000 do assert(DrawStringWidth(14,'FIXED','abc') == 42) end\n"
        "assert(not pcall(DrawStringWidth,14,'not a font','abc'))\n") == LUA_OK);
    CHECK(EM_ASM_INT({ return Module.widthCalls.length; }) == 1);
    draw_end();
    EM_ASM({ Module.scale = 1; });
    draw_begin();
    CHECK(luaL_dostring(L,
        "assert(DrawStringWidth(28,'FIXED','abc') == 84)\n"
        "assert(DrawStringWidth(14,'FIXED','abc') == 42)\n"
        "SetDPIScaleOverridePercent(200)\n"
        "assert(DrawStringWidth(14,'FIXED','abc') == 42)\n"
        "RenderInit()\n"
        "assert(DrawStringWidth(14,'FIXED','abc') == 42)\n"
        "RenderInit('DPI_AWARE'); SetDPIScaleOverridePercent(150)\n"
        "assert(DrawStringWidth(14,'FIXED','abc') == 44)\n"
        "SetDPIScaleOverridePercent(0)\n"
        "assert(DrawStringWidth('14','FIXED',123) == DrawStringWidth(14,'FIXED','123'))\n"
        "assert(DrawStringWidth(14,'FIXED','abc\\0ignored') == 42)\n") == LUA_OK);
    CHECK(EM_ASM_INT({ return Module.widthCalls.length; }) == 4);
    draw_end();
    // Compare all fonts and untouched UTF-8/color/multiline strings with the
    // uncached bridge. Store expected results in Lua, then destroy the cache.
    const char *fixture =
        "fonts={'FIXED','VAR','VAR BOLD','FONTIN SC','FONTIN SC ITALIC','FONTIN','FONTIN ITALIC'}\n"
        "strings={'','^1red ^x123456color','two\\nlines','caf\\195\\169 \\240\\159\\152\\128'}\n"
        "widths={}\n"
        "for i,f in ipairs(fonts) do widths[i]={}; for j,s in ipairs(strings) do\n"
        " widths[i][j]=DrawStringWidth(14,f,s)\n"
        " assert(DrawStringWidth(14,f,s)==widths[i][j])\n"
        "end end\n"
        "collectgarbage('collect')\n"
        "for i,f in ipairs(fonts) do for j,s in ipairs(strings) do assert(DrawStringWidth(14,f,s)==widths[i][j]) end end\n";
    draw_begin();
    CHECK(luaL_dostring(L, fixture) == LUA_OK);
    draw_end();
    CHECK(EM_ASM_INT({ return Module.widthCalls.length; }) == 32);
    TextWidthCacheProfile profile = text_width_cache_profile();
    CHECK(profile.entries == 32 && profile.hits >= 1000 && profile.misses == 32);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":32") != NULL);
    CHECK(strstr(get_text_width_cache_profile(), "\"enabled\":true") != NULL);
    // Model Canvas retaining a preceding font when a tiny CSS size is invalid.
    // The same key can then return a different authoritative JS width.
    EM_ASM({ Module.tinyWidth = 100; Module.getStringWidth = () => ++Module.tinyWidth; });
    CHECK(luaL_dostring(L,
        "assert(DrawStringWidth(0,'FIXED','tiny')==101)\n"
        "assert(DrawStringWidth(0,'FIXED','tiny')==102)\n"
        "assert(DrawStringWidth(2,'FIXED','tiny')==103)\n"
        "assert(DrawStringWidth(2,'FIXED','tiny')==104)\n") == LUA_OK);
    CHECK(text_width_cache_profile().entries == 32 && text_width_cache_profile().bypasses == 4);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":36") != NULL);
#ifdef NDEBUG
    EM_ASM({
        Module.getStringWidth = (height, font, text) => {
            Module.widthCalls.push({height, font, text});
            return text.length * height + font * 100;
        };
    });
    CHECK(luaL_dostring(L,
        "assert(DrawStringWidth(14,'FIXED',nil)==0)\n"
        "assert(DrawStringWidth(14,'FIXED',{})==0)\n") == LUA_OK);
    CHECK(EM_ASM_INT({ return Module.widthCalls.length; }) == 34);
    CHECK(text_width_cache_profile().entries == 32 && text_width_cache_profile().bypasses == 6);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":38") != NULL);
#endif
    // Runtime font/measurement replacement has an explicit invalidation hook.
    EM_ASM({ Module.getStringWidth = () => 777; Module.widthCalls = []; });
    invalidate_text_width_cache();
    CHECK(text_width_cache_profile().entries == 0 && text_width_cache_profile().enabled);
    CHECK(luaL_dostring(L, "assert(DrawStringWidth(14,'FIXED','abc')==777); assert(DrawStringWidth(14,'FIXED','abc')==777)") == LUA_OK);
    CHECK(text_width_cache_profile().misses == 1 && text_width_cache_profile().hits == 1);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":1") != NULL);
    text_width_cache_reset(false);
    CHECK(text_width_cache_profile().entries == 0 && text_width_cache_profile().text_bytes == 0);
    EM_ASM({
        Module.nativeTextWidthCacheEnabled = false;
        Module.widthCalls = [];
        Module.getStringWidth = (height, font, text) => {
            Module.widthCalls.push({height, font, text});
            return text.length * height + font * 100;
        };
    });
    draw_init(L);
    draw_begin();
    CHECK(luaL_dostring(L,
        "for i,f in ipairs(fonts) do for j,s in ipairs(strings) do\n"
        " assert(DrawStringWidth(14,f,s)==widths[i][j])\n"
        " assert(DrawStringWidth(14,f,s)==widths[i][j])\n"
        "end end\n") == LUA_OK);
    draw_end();
    CHECK(EM_ASM_INT({ return Module.widthCalls.length; }) == 56);
    profile = text_width_cache_profile();
    CHECK(!profile.enabled && profile.entries == 0 && profile.calls == 56 && profile.bypasses == 56);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":56") != NULL);
    set_text_width_cache_enabled(1);
    CHECK(text_width_cache_profile().enabled && text_width_cache_profile().entries == 0);
    CHECK(luaL_dostring(L,
        "assert(DrawStringWidth(14,'FIXED','abc')==42)\n"
        "assert(DrawStringWidth(14,'FIXED','abc')==42)\n") == LUA_OK);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":1") != NULL);
    CHECK(text_width_cache_profile().hits == 1 && text_width_cache_profile().misses == 1);
    set_text_width_cache_enabled(0);
    CHECK(!text_width_cache_profile().enabled && text_width_cache_profile().entries == 0);
    CHECK(luaL_dostring(L,
        "assert(DrawStringWidth(14,'FIXED','abc')==42)\n"
        "assert(DrawStringWidth(14,'FIXED','abc')==42)\n") == LUA_OK);
    CHECK(strstr(get_text_width_cache_profile(), "\"bridgeCalls\":2") != NULL);
    CHECK(text_width_cache_profile().bypasses == 2);
    text_width_cache_reset(false);
    lua_close(L);
}

int main(void) {
    test_text_width_cache_bounds();
    test_draw_string_width_cache();
    return 0;
}
