#ifndef DRIVER_DRAW_H
#define DRIVER_DRAW_H

#include "lua.h"

extern void draw_begin();
extern void draw_get_buffer(void **data, size_t *size);
extern void draw_end();
extern void draw_set_color(float r, float g, float b, float a);
extern void draw_image(int image_handle, float x, float y, float w, float h, float s1, float t1, float s2, float t2);
extern void draw_init(lua_State *L);

#endif //DRIVER_DRAW_H
