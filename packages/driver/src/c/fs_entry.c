#include <limits.h>
#include <stdio.h>
#include <sys/stat.h>

#include "fs_entry.h"

int fs_entry_matches_type(const char *directory, const char *name, int dir_only) {
    char path[PATH_MAX];
    int length = snprintf(path, sizeof(path), "%s/%s", directory, name);
    if (length < 0 || (size_t)length >= sizeof(path)) {
        return 0;
    }

    struct stat st;
    if (stat(path, &st) != 0) {
        return 0;
    }

    return dir_only ? S_ISDIR(st.st_mode) : S_ISREG(st.st_mode);
}
