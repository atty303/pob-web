#ifndef DRIVER_FS_H
#define DRIVER_FS_H

#include <dirent.h>
#include "lua.h"

typedef struct {
    char path[PATH_MAX];
    char pattern[PATH_MAX];
    DIR *dir;
    struct dirent *entry;
    int dir_only;
} FsReaddirHandle;

extern void fs_init(lua_State *L);

#endif //DRIVER_FS_H
