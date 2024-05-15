#ifndef DRIVER_IMAGE_H
#define DRIVER_IMAGE_H

#include "lua.h"

typedef struct {
    int handle;
    int width;
    int height;
} ImageHandle;

extern void image_init(lua_State *L);

#endif //DRIVER_IMAGE_H
