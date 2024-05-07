#ifndef DRIVER_DRAW_H
#define DRIVER_DRAW_H

#include "lua.h"

extern void draw_init(lua_State *L);
extern void draw_begin();
extern void draw_get_buffer(void **data, size_t *size);
extern void draw_end();

#endif //DRIVER_DRAW_H
