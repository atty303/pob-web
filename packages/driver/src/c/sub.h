#ifndef DRIVER_SUB_H
#define DRIVER_SUB_H

#include <stdint.h>
#include "lua.h"

void sub_init(lua_State *L);
int sub_lua_deserialize(lua_State *L, const uint8_t *serializedData);

#endif //DRIVER_SUB_H
