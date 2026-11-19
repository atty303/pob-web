#ifndef DRIVER_DRAW_H
#define DRIVER_DRAW_H

#include "lua.h"

extern void draw_init(lua_State *L);
extern void draw_begin();
extern void draw_get_buffer(void **data, size_t *size);
extern void draw_end();
extern void invalidate_text_width_cache(void);
extern void set_text_width_cache_enabled(int enabled);
extern const char *get_text_width_cache_profile(void);

#endif //DRIVER_DRAW_H
