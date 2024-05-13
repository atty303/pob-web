#include <stdarg.h>
#include <stdio.h>
#include <malloc.h>
#include <emscripten.h>
#include "util.h"

void log_error(const char *fmt, ...) {
    va_list args;

    va_start(args, fmt);
    int length = vsnprintf(NULL, 0, fmt, args);
    va_end(args);

    char *buffer = (char *) malloc(length + 1);
    if (buffer == NULL) {
        return;
    }

    va_start(args, fmt);
    vsnprintf(buffer, length + 1, fmt, args);
    va_end(args);

    EM_ASM_({
                console.error(UTF8ToString($0));
            }, buffer);

    free(buffer);
}
