#include "fs.h"

#include <emscripten/wasmfs.h>
#include <lauxlib.h>
#include <lualib.h>
#include <stdio.h>

extern backend_t wasmfs_create_nodefs_backend(const char *root);

int main(void) {
    backend_t backend = wasmfs_create_nodefs_backend("");
    wasmfs_create_directory("/app", 0777, backend);

    lua_State *L = luaL_newstate();
    luaL_openlibs(L);
    fs_init(L);

    const char *script =
            "assert(MakeDir('/app/user/Path of Building'))\n"
            "assert(MakeDir('/app/user/Path of Building/Builds'))\n"
            "assert(MakeDir('/app/user/Path of Building/Builds/Saved Builds'))\n"
            "local function save(name, value)\n"
            "  local file = assert(io.open('/app/user/Path of Building/Builds/Saved Builds/' .. name, 'wb'))\n"
            "  assert(file:write(value))\n"
            "  assert(file:close())\n"
            "end\n"
            "save('alpha.xml', '<PathOfBuilding name=\"alpha\"/>')\n"
            "save('beta.xml', '<PathOfBuilding name=\"beta\"/>')\n"
            "local folder = assert(NewFileSearch('/app/user/Path of Building/Builds/*', true))\n"
            "assert(folder:GetFileName() == 'Saved Builds')\n"
            "assert(folder:NextFile() == nil)\n"
            "assert(NewFileSearch('/app/user/Path of Building/Builds/Saved Builds', false) == nil)\n"
            "local search = assert(NewFileSearch('/app/user/Path of Building/Builds/Saved Builds/*.xml', false))\n"
            "local names = {[search:GetFileName()] = true}\n"
            "assert(search:NextFile())\n"
            "names[search:GetFileName()] = true\n"
            "assert(search:NextFile() == nil)\n"
            "assert(names['alpha.xml'] and names['beta.xml'])\n"
            "assert(NewFileSearch('/app/user/Path of Building/Builds/Saved Builds/*.xml', true) == nil)\n"
            "assert(NewFileSearch('/app/user/Path of Building/Builds/Saved Builds/missing-*.xml', false) == nil)\n"
            "local input = assert(io.open('/app/user/Path of Building/Builds/Saved Builds/beta.xml', 'rb'))\n"
            "assert(input:read('*a') == '<PathOfBuilding name=\"beta\"/>')\n"
            "assert(input:close())\n"
            "local persisted = assert(NewFileSearch('/app/user/Persisted/*.xml', false))\n"
            "assert(persisted:GetFileName() == 'existing.xml')\n"
            "local existing = assert(io.open('/app/user/Persisted/existing.xml', 'rb'))\n"
            "assert(existing:seek('end') > 0)\n"
            "assert(existing:seek('set', 0) == 0)\n"
            "assert(existing:read('*a') == '<PathOfBuilding name=\"existing\"/>')\n"
            "assert(existing:close())\n";

    int status = luaL_dostring(L, script);
    if (status != LUA_OK) {
        fprintf(stderr, "Lua filesystem integration failed: %s\n", lua_tostring(L, -1));
    }
    lua_close(L);
    return status == LUA_OK ? 0 : 1;
}
