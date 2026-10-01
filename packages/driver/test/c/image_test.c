#include <stdio.h>
#include <stdlib.h>
#include <emscripten.h>
#include "lauxlib.h"
#include "lualib.h"
#include "image.h"
#define CHECK(condition) do { if (!(condition)) { fprintf(stderr, "Check failed at %d: %s\n", __LINE__, #condition); exit(EXIT_FAILURE); } } while (0)
static int test_image_resource_id(lua_State *L) {
    ImageHandle *image = lua_touserdata(L, 1);
    CHECK(image != NULL);
    lua_pushinteger(L, image->handle);
    return 1;
}

static void test_image_resource_reuse(void) {
    // This fixture lives only in the executable's in-memory Emscripten FS.
    FILE *manifest = fopen(".image.tsv", "w");
    CHECK(manifest != NULL);
    fputs("icon-a.png\t32\t48\nicon-b.png\t80\t96\n", manifest);
    fclose(manifest);
    EM_ASM({
        Module.imageCalls = [];
        Module.imageLoad = (id, filename, flags) => Module.imageCalls.push({id, filename, flags});
    });
    lua_State *L = luaL_newstate();
    CHECK(L != NULL);
    luaL_openlibs(L);
    image_init(L);
    lua_pushcfunction(L, test_image_resource_id);
    lua_setglobal(L, "resourceId");
    const char *script =
        "local empty = NewImageHandle()\n"
        "assert(resourceId(empty) == -1)\n"
        "local w,h = empty:ImageSize(); assert(w == 1 and h == 1)\n"
        "for i=1,1000 do NewImageHandle() end\n"
        "local a = NewImageHandle(); a:Load('icon-a.png')\n"
        "local original = resourceId(a); assert(original == 1)\n"
        "w,h = a:ImageSize(); assert(w == 32 and h == 48)\n"
        "local b = NewImageHandle(); b:Load('icon-a.png','ASYNC')\n"
        "assert(a ~= b and resourceId(b) == original)\n"
        "local flags = {{'MIPMAP'}, {'MIPMAP','CLAMP'}, {}, {'CLAMP'},\n"
        "  {'MIPMAP','NEAREST'}, {'MIPMAP','NEAREST','CLAMP'}, {'NEAREST'}, {'CLAMP','NEAREST'}}\n"
        "local ids = {}\n"
        "for i, f in ipairs(flags) do\n"
        "  local image = NewImageHandle(); image:Load('icon-a.png', table.unpack(f))\n"
        "  assert(not ids[resourceId(image)]); ids[resourceId(image)] = true\n"
        "end\n"
        "b:Load('icon-a.png','NEAREST','CLAMP','ASYNC','CLAMP')\n"
        "local sharedFlags = resourceId(b)\n"
        "a:Load('icon-a.png','CLAMP','NEAREST'); assert(resourceId(a) == sharedFlags)\n"
        "b:Load('icon-b.png'); assert(not ids[resourceId(b)])\n"
        "local secondSource = resourceId(b)\n"
        "w,h = b:ImageSize(); assert(w == 80 and h == 96)\n"
        "a:Load('icon-b.png'); assert(resourceId(a) == secondSource)\n"
        "w,h = a:ImageSize(); assert(w == 80 and h == 96)\n"
        "a:Load('icon-a.png'); assert(resourceId(a) == original)\n"
        "w,h = a:ImageSize(); assert(w == 32 and h == 48)\n"
        "for i=1,1000 do\n"
        "  local icon = NewImageHandle(); icon:Load('icon-a.png')\n"
        "  assert(resourceId(icon) == original)\n"
        "end\n"
        "collectgarbage('collect')\n"
        "local icon = NewImageHandle(); icon:Load('icon-a.png')\n"
        "assert(resourceId(icon) == original)\n";
    if (luaL_dostring(L, script) != LUA_OK) {
        fprintf(stderr, "Image resource regression: %s\n", lua_tostring(L, -1));
        exit(EXIT_FAILURE);
    }
    // Eight effective flag combinations plus a different filename: repeated
    // allocations/reloads must not grow the native/JS resource identity set.
    CHECK(EM_ASM_INT({ return new Set(Module.imageCalls.map(call => call.id)).size; }) == 9);
    CHECK(EM_ASM_INT({ return Module.imageCalls.length; }) == 9);
    CHECK(EM_ASM_INT({
        return Module.imageCalls.every(call => call.id > 0 &&
            (call.filename === 'icon-a.png' || call.filename === 'icon-b.png') &&
            call.flags >= 0 && call.flags <= 7);
    }));
    lua_close(L);
    remove(".image.tsv");
}


int main(void) { test_image_resource_reuse(); return 0; }
