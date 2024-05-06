#include <stdio.h>
#include <emscripten.h>
#include "lua.h"

lua_State *driver_new_state() {
  lua_State *L = lua_newstate(NULL, NULL);
  return L;
}

int init() {
    printf("init\n");
    return 2;
}
